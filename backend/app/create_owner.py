import getpass
from sqlalchemy.orm import Session
from .database import Base, engine, SessionLocal
from .models import AdminUser
from .security import hash_password

def main():
    Base.metadata.create_all(bind=engine)
    username = input("Tulajdonosi felhasználónév: ").strip()
    if len(username) < 3:
        raise SystemExit("A felhasználónév legalább 3 karakter legyen.")
    password = getpass.getpass("Jelszó (legalább 12 karakter): ")
    confirm = getpass.getpass("Jelszó újra: ")
    if len(password) < 12 or password != confirm:
        raise SystemExit("A jelszavak nem egyeznek, vagy túl rövidek.")
    db: Session = SessionLocal()
    try:
        if db.query(AdminUser).filter(AdminUser.username == username).first():
            raise SystemExit("Ez a felhasználónév már létezik.")
        db.add(AdminUser(username=username, password_hash=hash_password(password), role="owner"))
        db.commit()
        print("Tulajdonosi admin létrehozva.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
