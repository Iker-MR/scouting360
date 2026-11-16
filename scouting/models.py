from datetime import date

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
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.nombre} ({self.get_posicion_display()})"

    def nombre_publico(self):
        """First name plus surname initial: "Iker Martínez Ruiz" -> "Iker M."."""
        partes = self.nombre.split()
        if len(partes) < 2:
            return " ".join(partes)
        return f"{partes[0]} {partes[1][0].upper()}."

    def edad(self, hoy=None):
        hoy = hoy or date.today()
        cumplio = (hoy.month, hoy.day) >= (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        return hoy.year - self.fecha_nacimiento.year - (0 if cumplio else 1)


class Ojeador(models.Model):
    class Plan(models.TextChoices):
        GRATIS = "gratis", "Gratis"
        PREMIUM = "premium", "Premium"

    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ojeador")
    nombre = models.CharField(max_length=100)
    organizacion = models.CharField(max_length=100, blank=True)
    # Only staff can verify a scout (admin); the API never writes this field.
    verificado = models.BooleanField(default=False)
    # Subscription, independent from verificado. Set by staff (later by payment), never by the API.
    plan = models.CharField(max_length=10, choices=Plan.choices, default=Plan.GRATIS)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]
        verbose_name_plural = "ojeadores"

    def __str__(self):
        return self.nombre


class Conversacion(models.Model):
    """A thread a scout starts with a player. Each one spends free-plan quota."""

    ojeador = models.ForeignKey(Ojeador, on_delete=models.CASCADE, related_name="conversaciones")
    jugador = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name="conversaciones")
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creada"]
        verbose_name_plural = "conversaciones"
        constraints = [
            models.UniqueConstraint(fields=["ojeador", "jugador"], name="conversacion_unica_por_par"),
        ]

    def __str__(self):
        return f"{self.ojeador} → {self.jugador}"


class Mensaje(models.Model):
    conversacion = models.ForeignKey(Conversacion, on_delete=models.CASCADE, related_name="mensajes")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mensajes")
    texto = models.TextField()
    enviado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["enviado"]
