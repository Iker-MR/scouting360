from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from scouting.test_views import DATOS_JUGADOR, LISTA_URL

TOKEN_URL = reverse("token_obtain_pair")
REFRESH_URL = reverse("token_refresh")
LOGOUT_URL = reverse("logout")
ORIGEN_SPA = "http://localhost:5173"
COOKIE = settings.JWT_REFRESH_COOKIE["NAME"]


class JWTTests(APITestCase):
    def setUp(self):
        self.credenciales = {"username": "ojeador", "password": "clave-segura-123"}
        get_user_model().objects.create_user(**self.credenciales)

    def login(self):
        return self.client.post(TOKEN_URL, self.credenciales)

    def test_login_devuelve_access_en_el_body(self):
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_login_no_expone_el_refresh_en_el_body(self):
        response = self.login()

        self.assertNotIn("refresh", response.data)

    def test_login_guarda_el_refresh_en_cookie_httponly(self):
        response = self.login()

        cookie = response.cookies[COOKIE]
        self.assertTrue(cookie.value)
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["path"], settings.JWT_REFRESH_COOKIE["PATH"])
        self.assertEqual(cookie["samesite"], settings.JWT_REFRESH_COOKIE["SAMESITE"])

    def test_credenciales_invalidas_devuelven_401_sin_cookie(self):
        response = self.client.post(
            TOKEN_URL, {"username": "ojeador", "password": "incorrecta"}
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn(COOKIE, response.cookies)

    def test_refresh_con_cookie_devuelve_nuevo_access(self):
        self.login()

        response = self.client.post(REFRESH_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_refresh_sin_cookie_devuelve_401(self):
        response = self.client.post(REFRESH_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_con_cookie_invalida_devuelve_401(self):
        self.client.cookies[COOKIE] = "token-falso"

        response = self.client.post(REFRESH_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_ignora_el_refresh_del_body(self):
        refresh_valido = self.login().cookies[COOKIE].value
        self.client.cookies.clear()

        response = self.client.post(REFRESH_URL, {"refresh": refresh_valido})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_borra_la_cookie(self):
        self.login()

        response = self.client.post(LOGOUT_URL)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.cookies[COOKIE].value, "")
        self.assertEqual(response.cookies[COOKIE]["max-age"], 0)

    def test_bearer_valido_permite_crear_jugador(self):
        access = self.login().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_bearer_invalido_devuelve_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-falso")

        response = self.client.post(LISTA_URL, DATOS_JUGADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CORSTests(APITestCase):
    def preflight(self):
        return self.client.options(
            TOKEN_URL,
            HTTP_ORIGIN=ORIGEN_SPA,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )

    def test_preflight_desde_la_spa_permite_el_origen(self):
        response = self.preflight()

        self.assertEqual(response["Access-Control-Allow-Origin"], ORIGEN_SPA)

    def test_preflight_permite_enviar_credenciales(self):
        response = self.preflight()

        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
