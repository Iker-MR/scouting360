from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Ojeador
from .tests import crear_jugador, crear_ojeador

# Literal paths on purpose: the frontend depends on these exact URLs.
LISTA_URL = "/api/ojeadores/"

DATOS_OJEADOR = {"nombre": "Ana Ruiz", "organizacion": "CD Ejemplo"}

User = get_user_model()


def detalle_url(ojeador):
    return f"/api/ojeadores/{ojeador.pk}/"


class OjeadorPlanModeloTests(APITestCase):
    def test_un_ojeador_nuevo_nace_en_plan_gratis(self):
        ojeador = crear_ojeador("nueva")

        self.assertEqual(ojeador.plan, "gratis")


class OjeadorCreacionTests(APITestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(username="nueva", password="x")

    def test_anonimo_no_puede_crear(self):
        response = self.client.post(LISTA_URL, DATOS_OJEADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Ojeador.objects.exists())

    def test_crea_ojeador_asignado_al_usuario_y_sin_verificar(self):
        otro = User.objects.create_user(username="otro", password="x")
        self.client.force_authenticate(self.usuario)

        response = self.client.post(
            LISTA_URL, {**DATOS_OJEADOR, "usuario": otro.pk}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ojeador = Ojeador.objects.get()
        self.assertEqual(ojeador.usuario, self.usuario)
        self.assertFalse(ojeador.verificado)

    def test_ignora_verificado_enviado_por_el_cliente(self):
        self.client.force_authenticate(self.usuario)

        response = self.client.post(
            LISTA_URL, {**DATOS_OJEADOR, "verificado": True}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Ojeador.objects.get().verificado)

    def test_ignora_plan_enviado_por_el_cliente(self):
        # Premium is granted by staff (and later by payment), never self-assigned.
        self.client.force_authenticate(self.usuario)

        response = self.client.post(
            LISTA_URL, {**DATOS_OJEADOR, "plan": "premium"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Ojeador.objects.get().plan, "gratis")

    def test_no_permite_un_segundo_ojeador_para_el_mismo_usuario(self):
        self.client.force_authenticate(self.usuario)
        self.client.post(LISTA_URL, DATOS_OJEADOR, format="json")

        response = self.client.post(LISTA_URL, DATOS_OJEADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Ojeador.objects.count(), 1)

    def test_un_jugador_no_puede_ser_ojeador(self):
        jugador = crear_jugador("jugadora")
        self.client.force_authenticate(jugador.usuario)

        response = self.client.post(LISTA_URL, DATOS_OJEADOR, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("usuario", response.data)
        self.assertFalse(Ojeador.objects.exists())


class OjeadorLecturaTests(APITestCase):
    def setUp(self):
        self.ojeador = crear_ojeador("duena")

    def test_anonimo_no_puede_ver_un_ojeador(self):
        response = self.client.get(detalle_url(self.ojeador))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dueno_ve_su_plan(self):
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.client.get(detalle_url(self.ojeador))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data), {"id", "nombre", "organizacion", "verificado", "plan"}
        )
        self.assertEqual(response.data["plan"], "gratis")

    def test_otro_usuario_ve_solo_los_campos_publicos(self):
        # The plan is the scout's commercial data: useless (and private) to others.
        ajeno = User.objects.create_user(username="ajeno", password="x")
        self.client.force_authenticate(ajeno)

        response = self.client.get(detalle_url(self.ojeador))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data), {"id", "nombre", "organizacion", "verificado"}
        )

    def test_no_existe_listado_de_ojeadores(self):
        # The route exists for POST, so a GET is "method not allowed", not 404.
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.client.get(LISTA_URL)

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class OjeadorModificacionTests(APITestCase):
    def setUp(self):
        self.ojeador = crear_ojeador("duena")
        self.ajeno = User.objects.create_user(username="ajeno", password="x")

    def test_dueno_puede_editar_su_perfil(self):
        self.client.force_authenticate(self.ojeador.usuario)

        response = self.client.patch(
            detalle_url(self.ojeador), {"organizacion": "Agencia X"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ojeador.refresh_from_db()
        self.assertEqual(self.ojeador.organizacion, "Agencia X")

    def test_dueno_no_puede_autoverificarse(self):
        self.client.force_authenticate(self.ojeador.usuario)

        self.client.patch(detalle_url(self.ojeador), {"verificado": True}, format="json")

        self.ojeador.refresh_from_db()
        self.assertFalse(self.ojeador.verificado)

    def test_dueno_no_puede_hacerse_premium(self):
        self.client.force_authenticate(self.ojeador.usuario)

        self.client.patch(detalle_url(self.ojeador), {"plan": "premium"}, format="json")

        self.ojeador.refresh_from_db()
        self.assertEqual(self.ojeador.plan, "gratis")

    def test_otro_usuario_no_puede_editar(self):
        self.client.force_authenticate(self.ajeno)

        response = self.client.patch(
            detalle_url(self.ojeador), {"organizacion": "Agencia X"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.ojeador.refresh_from_db()
        self.assertEqual(self.ojeador.organizacion, "CD Ejemplo")
