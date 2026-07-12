import os

from flask import Flask, abort
from backend.config import Config
from backend.extensions import db, login_manager


def create_app():
    app = Flask(__name__, static_folder="static")
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = "basic"

    with app.app_context():
        import backend.models  # noqa: F401 — ensure models are registered before create_all
        db.create_all()

    os.makedirs(app.config["EXPORT_FOLDER"], exist_ok=True)
    os.makedirs(app.config["REPORTS_FOLDER"], exist_ok=True)
    os.makedirs(app.config["LOGS_FOLDER"], exist_ok=True)

    from backend.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from backend.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from backend.routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    from backend.routes.staff import staff_bp
    app.register_blueprint(staff_bp)

    from backend.routes.user import user_bp
    app.register_blueprint(user_bp)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        if path.startswith("api/"):
            abort(404)
        return app.send_static_file("index.html")

    return app
