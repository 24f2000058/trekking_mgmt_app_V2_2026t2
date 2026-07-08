from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, current_user
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")

    if not name or not isinstance(name, str):
        return jsonify({"error": "Name is required"}), 400
    if not email or not isinstance(email, str):
        return jsonify({"error": "Email is required"}), 400
    if not password or not isinstance(password, str):
        return jsonify({"error": "Password is required"}), 400
    if "@" not in email:
        return jsonify({"error": "Please provide a valid email"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(name=name, email=email, role="trekker", status="active", phone=phone)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Registration successful. Please log in."}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not password or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401
    if user.status == "blacklisted":
        return jsonify({"error": "Your account has been deactivated."}), 403

    login_user(user)

    return jsonify({
        "message": "Login successful",
        "role": user.role,
        "name": user.name,
        "id": user.id,
    }), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    logout_user()
    return jsonify({"message": "Logged out"}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    if current_user.is_authenticated:
        return jsonify({
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
        }), 200
    return jsonify({"error": "Not authenticated"}), 401
