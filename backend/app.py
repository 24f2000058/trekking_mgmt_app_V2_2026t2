from flask import Flask
from config import Config
from extensions import db


def create_app():
    app = Flask(__name__, static_folder="static")
    app.config.from_object(Config)

    db.init_app(app)

    with app.app_context():
        import models  # noqa: F401 — ensure models are registered before create_all
        db.create_all()

    return app
