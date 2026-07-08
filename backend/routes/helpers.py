from functools import wraps
from flask import jsonify
from flask_login import current_user


def login_required_api(f):
    """Returns 401 JSON instead of redirecting (for API routes)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Returns 403 JSON if current user's role is not in roles list."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({"error": "Authentication required"}), 401
            if current_user.role not in roles:
                return jsonify({"error": "Access forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
