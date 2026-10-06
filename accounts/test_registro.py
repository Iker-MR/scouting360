from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import QuerySet
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

REGISTRO_URL = reverse("register")
TOKEN_URL = reverse("token_obtain_pair")

DATOS_REGISTRO = {
    "username": "ojeadora",
    "email": "ojeadora@example.com",
    "password": "clave-segura-123",
}

User = get_user_model()


class RegistroTests(APITestCase):
    def setUp(self):
        # Throttle counters live in the cache and would leak between tests.
        cache.clear()

    def registrar(self, **cambios):
        return self.client.post(REGISTRO_URL, {**DATOS_REGISTRO, **cambios})

    def test_registro_valido_crea_el_usuario(self):
        response = self.registrar()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], "ojeadora")
        self.assertEqual(response.data["email"], "ojeadora@example.com")
        self.assertIn("id", response.data)
        self.assertTrue(User.objects.filter(username="ojeadora").exists())

    def test_registro_no_devuelve_la_password(self):
        response = self.registrar()

        self.assertNotIn("password", response.data)

    def test_registro_guarda_la_password_hasheada(self):
        self.registrar()

        usuario = User.objects.get(username="ojeadora")
        self.assertNotEqual(usuario.password, DATOS_REGISTRO["password"])
        self.assertTrue(usuario.check_password(DATOS_REGISTRO["password"]))

    def test_usuario_registrado_puede_hacer_login(self):
        self.registrar()

        response = self.client.post(
            TOKEN_URL,
            {"username": "ojeadora", "password": DATOS_REGISTRO["password"]},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_email_es_opcional(self):
        response = self.client.post(
            REGISTRO_URL,
            {"username": "sinmail", "password": DATOS_REGISTRO["password"]},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_faltan_campos_obligatorios_devuelve_400(self):
        response = self.client.post(REGISTRO_URL, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.assertIn("password", response.data)

    def test_username_duplicado_devuelve_400(self):
        self.registrar()

        response = self.registrar(email="otra@example.com")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_carrera_con_username_duplicado_devuelve_400(self):
        # Simulates two concurrent requests: the uniqueness validator does not
        # see the user the other request just inserted.
        self.registrar()

        with mock.patch.object(QuerySet, "exists", return_value=False):
            response = self.registrar()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.assertEqual(User.objects.count(), 1)

    def test_password_debil_devuelve_400(self):
        response = self.registrar(password="123")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.exists())

    def test_password_parecida_al_username_devuelve_400(self):
        response = self.registrar(username="delanterocentro", password="delanterocentro1")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_email_invalido_devuelve_400(self):
        response = self.registrar(email="no-es-un-email")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_demasiados_registros_devuelven_429(self):
        for i in range(5):
            self.registrar(username=f"usuario{i}")

        response = self.registrar(username="uno-de-mas")

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
