from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from .tests import crear_jugador, crear_ojeador

LISTA_URL = reverse("jugador-list")

# Born on 1 January: on any day of the current year the age is exactly 20.
NACIMIENTO = date(date.today().year - 20, 1, 1)

CAMPOS_PUBLICOS = {
    "id",
    "nombre",
    "edad",
    "posicion",
    "posicion_display",
    "pierna_dominante",
    "zona",
    "club_actual",
    "disponible",
    "foto",
    "creado",
}
CAMPOS_DUENO = CAMPOS_PUBLICOS | {"fecha_nacimiento"}


def detalle_url(jugador):
    return reverse("jugador-detail", args=[jugador.pk])


class PerfilPublicoTests(APITestCase):
    """Public profiles must not hand out what is needed to contact a player elsewhere."""

    def setUp(self):
        self.jugador = crear_jugador(
            "iker", nombre="Iker Martínez Ruiz", fecha_nacimiento=NACIMIENTO
        )

    def test_anonimo_ve_el_detalle_recortado(self):
        response = self.client.get(detalle_url(self.jugador))

        self.assertEqual(set(response.data), CAMPOS_PUBLICOS)
        self.assertEqual(response.data["nombre"], "Iker M.")
        self.assertEqual(response.data["edad"], 20)

    def test_anonimo_ve_el_listado_recortado(self):
        response = self.client.get(LISTA_URL)

        [tarjeta] = response.data["results"]
        self.assertEqual(set(tarjeta), CAMPOS_PUBLICOS)
        self.assertEqual(tarjeta["nombre"], "Iker M.")

    def test_otro_usuario_autenticado_tambien_ve_el_perfil_recortado(self):
        ojeador = crear_ojeador("ojeadora")
        self.client.force_authenticate(ojeador.usuario)

        response = self.client.get(detalle_url(self.jugador))

        self.assertEqual(set(response.data), CAMPOS_PUBLICOS)
        self.assertEqual(response.data["nombre"], "Iker M.")


class PerfilDelDuenoTests(APITestCase):
    def setUp(self):
        self.jugador = crear_jugador(
            "iker", nombre="Iker Martínez Ruiz", fecha_nacimiento=NACIMIENTO
        )
        self.client.force_authenticate(self.jugador.usuario)

    def test_dueno_ve_su_detalle_completo(self):
        response = self.client.get(detalle_url(self.jugador))

        self.assertEqual(set(response.data), CAMPOS_DUENO)
        self.assertEqual(response.data["nombre"], "Iker Martínez Ruiz")
        self.assertEqual(response.data["fecha_nacimiento"], NACIMIENTO.isoformat())
        self.assertEqual(response.data["edad"], 20)

    def test_en_el_listado_el_dueno_ve_solo_su_tarjeta_completa(self):
        otro = crear_jugador("ana", nombre="Ana Ruiz Gil")

        response = self.client.get(LISTA_URL)

        por_id = {tarjeta["id"]: tarjeta for tarjeta in response.data["results"]}
        self.assertEqual(por_id[self.jugador.pk]["nombre"], "Iker Martínez Ruiz")
        self.assertIn("fecha_nacimiento", por_id[self.jugador.pk])
        self.assertEqual(por_id[otro.pk]["nombre"], "Ana R.")
        self.assertNotIn("fecha_nacimiento", por_id[otro.pk])

    def test_la_respuesta_al_crear_es_la_del_dueno(self):
        # The creator is the owner, so the edit form gets the full name back.
        nuevo = get_user_model().objects.create_user(username="nuevo", password="x")
        self.client.force_authenticate(nuevo)

        response = self.client.post(
            LISTA_URL,
            {
                "nombre": "Luis Gil",
                "fecha_nacimiento": "2004-05-10",
                "posicion": "MC",
                "pierna_dominante": "D",
                "zona": "Bilbao",
            },
            format="json",
        )

        self.assertEqual(response.data["nombre"], "Luis Gil")
        self.assertEqual(response.data["fecha_nacimiento"], "2004-05-10")


class BusquedaTests(APITestCase):
    def setUp(self):
        self.jugador = crear_jugador(
            "iker", nombre="Iker Martínez Ruiz", club_actual="Athletic B", zona="Bilbao"
        )
        # Another club and zone: proves the search filters, not just returns everyone.
        crear_jugador("luis", nombre="Luis Gil", club_actual="Sevilla Atlético", zona="Sevilla")

    def test_buscar_por_apellido_no_confirma_el_nombre_completo(self):
        # Searching the hidden surname must not reveal who carries it.
        response = self.client.get(LISTA_URL, {"search": "Martínez"})

        self.assertEqual(response.data["count"], 0)

    def test_se_puede_buscar_por_club_y_zona(self):
        por_club = self.client.get(LISTA_URL, {"search": "Athletic"})
        por_zona = self.client.get(LISTA_URL, {"search": "Bilbao"})

        self.assertEqual([j["id"] for j in por_club.data["results"]], [self.jugador.pk])
        self.assertEqual([j["id"] for j in por_zona.data["results"]], [self.jugador.pk])
