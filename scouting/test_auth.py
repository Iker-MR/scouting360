from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .test_views import DATOS_JUGADOR, LISTA_URL

TOKEN_URL = reverse("token_obtain_pair")
REFRESH_URL = reverse("token_refresh")
ORIGEN_SPA = "http://localhost:5173"


class JWTTests(APITestCase):
    def setUp(self):
        self.credenciales = {"username": "ojeador", "password": "clave-segura-123"}
        get_user_model().objects.create_user(**self.credenciales)

    def obtener_tokens(self):
        return self.client.post(TOKEN_URL, self.credenciales).data

    def test_credenciales_validas_devuelven_access_y_refresh(self):
        response = self.client.post(TOKEN_URL, self.credenciales)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_credenciales_invalidas_devuelven_401(self):
        response = self.client.post(
            TOKEN_URL, {"username": "ojeador", "password": "incorrecta"}
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_devuelve_nuevo_access(self):
        refresh = self.obtener_tokens()["refresh"]

        response = self.client.post(REFRESH_URL, {"refresh": refresh})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_bearer_valido_permite_crear_jugador(self):
        access = self.obtener_tokens()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_bearer_invalido_devuelve_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-falso")

        response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CORSTests(APITestCase):
    def test_preflight_desde_la_spa_permite_el_origen(self):
        response = self.client.options(
            TOKEN_URL,
            HTTP_ORIGIN=ORIGEN_SPA,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )

        self.assertEqual(response["Access-Control-Allow-Origin"], ORIGEN_SPA)
