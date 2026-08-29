import os
from pathlib import Path
from typing import Annotated, Any
from dotenv import load_dotenv

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from database import get_db
from models import User

load_dotenv(Path(__file__).parent / '.env')

CLERK_ISSUER = os.environ['CLERK_ISSUER'].rstrip('/')
CLERK_JWKS_URL = os.environ['CLERK_JWKS_URL']

jwks_client = PyJWKClient(CLERK_JWKS_URL)


def _unauthorized(detail: str = "Invalid or missing authentication") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _get_bearer_token(request: Request) -> str:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized()
    return token.strip()


def _verify_token(token: str) -> dict[str, Any]:
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"require": ["sub", "iss", "exp", "iat"]},
        )
    except jwt.PyJWTError as exc:
        raise _unauthorized() from exc


async def get_current_user(
    request: Request, db: Annotated[AsyncSession, Depends(get_db)]
) -> str:
    """Verify the Clerk session token, upsert the User, and return the clerk_id."""
    claims = _verify_token(_get_bearer_token(request))
    clerk_id = claims["sub"]

    stmt = (
        pg_insert(User)
        .values(
            clerk_id=clerk_id,
            email=claims.get("email"),
            name=claims.get("name"),
        )
        .on_conflict_do_nothing(index_elements=["clerk_id"])
    )
    await db.execute(stmt)
    await db.commit()
    return clerk_id


CurrentUserId = Annotated[str, Depends(get_current_user)]
