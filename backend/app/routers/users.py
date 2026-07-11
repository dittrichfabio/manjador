from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserProfile
from app.services.tdee import get_user_goals

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.username).all()


@router.post("/", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(username=payload.username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: UserCreate, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    response.set_cookie(
        key="user_id",
        value=str(user.id),
        httponly=True,
        max_age=60 * 60 * 24 * 30,
        samesite="lax",
    )
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("user_id")
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserProfile)
def get_me(user_id: Optional[str] = Cookie(default=None), db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    goals = get_user_goals(user)
    return UserProfile(**UserOut.model_validate(user).model_dump(), **{
        "computed_bmr": goals["computed_bmr"],
        "computed_tdee": goals["computed_tdee"],
        "suggested_calories": goals["suggested_calories"],
        "suggested_protein_g": goals["suggested_protein_g"],
        "suggested_carbs_g": goals["suggested_carbs_g"],
        "suggested_fat_g": goals["suggested_fat_g"],
    })


@router.get("/{user_id}", response_model=UserProfile)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    goals = get_user_goals(user)
    return UserProfile(**UserOut.model_validate(user).model_dump(), **{
        "computed_bmr": goals["computed_bmr"],
        "computed_tdee": goals["computed_tdee"],
        "suggested_calories": goals["suggested_calories"],
        "suggested_protein_g": goals["suggested_protein_g"],
        "suggested_carbs_g": goals["suggested_carbs_g"],
        "suggested_fat_g": goals["suggested_fat_g"],
    })


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
