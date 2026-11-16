from datetime import date

from django.test import SimpleTestCase

from .models import Jugador


class JugadorNombrePublicoTests(SimpleTestCase):
    def test_abrevia_el_apellido(self):
        self.assertEqual(Jugador(nombre="Iker Martínez Ruiz").nombre_publico(), "Iker M.")

    def test_un_solo_nombre_queda_igual(self):
        self.assertEqual(Jugador(nombre="Iker").nombre_publico(), "Iker")

    def test_ignora_espacios_sobrantes(self):
        self.assertEqual(Jugador(nombre="  Iker   martínez ").nombre_publico(), "Iker M.")


class JugadorEdadTests(SimpleTestCase):
    def test_cuenta_los_anos_cumplidos(self):
        jugador = Jugador(fecha_nacimiento=date(2005, 3, 10))

        self.assertEqual(jugador.edad(hoy=date(2026, 3, 10)), 21)

    def test_descuenta_un_ano_si_aun_no_cumplio(self):
        jugador = Jugador(fecha_nacimiento=date(2005, 3, 10))

        self.assertEqual(jugador.edad(hoy=date(2026, 3, 9)), 20)
