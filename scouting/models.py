from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.conf import settings
# Create your models here.

class Jugador (models.Model):
    class Posicion(models.TextChoices):
        PORTERO = "PO", "Portero"
        DEFENSA_CENTRAL = "DC", "Defensa central"
        LATERAL_DERECHO = "LD", "Lateral derecho"
        LATERAL_IZQUIERDO = "LI", "Lateral izquierdo"
        MEDIOCENTRO = "MC", "Mediocentro"
        MEDIAPUNTA = "MP", "Mediapunta"
        EXTREMO_DERECHO = "ED", "Extremo derecho"
        EXTREMO_IZQUIERDO = "EI", "Extremo izquierdo"
        DELANTERO = "DL", "Delantero centro"


    class Pierna (models.TextChoices):
        DIESTRA = "D", "Derecha"
        ZURDA = "I", "Zurda"


    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="jugador")
    nombre = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField()
    posicion = models.CharField(max_length=2, choices=Posicion.choices)
    pierna_dominante = models.CharField(max_length=1, choices=Pierna.choices)
    zona = models.CharField(max_length=100)
    club_actual = models.CharField(max_length=100, blank=True)
    disponible = models.BooleanField(default=True)
    foto = models.ImageField(upload_to="jugadores/fotos/", blank=True, null=True)
    bio = models.CharField(max_length=280, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.nombre} ({self.get_posicion_display()})"

    @property
    def overall(self):
        if not hasattr(self, "atributos"):
            return None
        a = self.atributos
        valores = [a.ritmo, a.tiro, a.pase, a.regate, a.defensa, a.fisico]
        return round(sum(valores) / len(valores))


def atributo_field():
    return models.PositiveSmallIntegerField(
        default=50,
        validators=[MinValueValidator(0), MaxValueValidator(99)],
    )


class Atributos(models.Model):
    jugador = models.OneToOneField(Jugador, on_delete=models.CASCADE, related_name="atributos")
    ritmo = atributo_field()
    tiro = atributo_field()
    pase = atributo_field()
    regate = atributo_field()
    defensa = atributo_field()
    fisico = atributo_field()
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "atributos"

    def __str__(self):
        return f"Atributos de {self.jugador.nombre}"
