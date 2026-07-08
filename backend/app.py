from flask import Flask, abort
from config import Config
from extensions import db, login_manager


def create_app():
    app = Flask(__name__, static_folder="static")
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.session_protection = "basic"

    with app.app_context():
        import models  # noqa: F401 — ensure models are registered before create_all
        db.create_all()

    from models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        if path.startswith("api/"):
            abort(404)
        return app.send_static_file("index.html")

    return app
