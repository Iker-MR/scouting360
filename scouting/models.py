from django.db import models
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
