extends Node2D

const WIDTH := 1152.0
const HEIGHT := 648.0
const GRAVITY := 1450.0
const RUN_SPEED := 285.0
const JUMP_SPEED := -585.0

var hero := {"pos": Vector2(145, 470), "vel": Vector2.ZERO, "facing": 1, "armor": 0, "hp": 3, "invuln": 0.0}
var platforms := [Rect2(0, 540, WIDTH, 108), Rect2(110, 430, 235, 24), Rect2(430, 365, 220, 24), Rect2(760, 455, 245, 24), Rect2(890, 290, 190, 24)]
var enemies := [{"pos": Vector2(590, 320), "alive": true, "dir": -1.0}, {"pos": Vector2(890, 410), "alive": true, "dir": 1.0}, {"pos": Vector2(975, 245), "alive": true, "dir": -1.0}]
var arrows: Array[Dictionary] = []
var weapon := 0
var weapon_names := ["ESPADA", "ARCO", "ESCUDO"]
var attack_timer := 0.0
var attack_cooldown := 0.0
var bow_cooldown := 0.0
var message := "Encontre as runas para recuperar sua armadura."
var message_timer := 5.0
var runes := [Vector2(540, 325), Vector2(935, 250)]
var collected := 0

func _ready() -> void:
	queue_redraw()

func _physics_process(delta: float) -> void:
	var left := Input.is_action_pressed("move_left")
	var right := Input.is_action_pressed("move_right")
	var blocking := Input.is_action_pressed("block") and weapon == 2
	var axis := float(right) - float(left)
	if axis != 0:
		hero.facing = 1 if axis > 0 else -1
		hero.vel.x = move_toward(hero.vel.x, axis * RUN_SPEED, 1600.0 * delta)
	else:
		hero.vel.x = move_toward(hero.vel.x, 0.0, 1900.0 * delta)

	if Input.is_action_just_pressed("switch_weapon"):
		weapon = (weapon + 1) % weapon_names.size()
		message = "Equipado: " + weapon_names[weapon]
		message_timer = 2.0

	if Input.is_action_just_pressed("jump") and _on_floor():
		hero.vel.y = JUMP_SPEED
	if not blocking:
		hero.vel.y += GRAVITY * delta
	else:
		hero.vel.x *= 0.35

	attack_cooldown = max(attack_cooldown - delta, 0.0)
	bow_cooldown = max(bow_cooldown - delta, 0.0)
	attack_timer = max(attack_timer - delta, 0.0)
	if Input.is_action_just_pressed("attack") and attack_cooldown <= 0.0:
		if weapon == 0:
			attack_timer = 0.18
			attack_cooldown = 0.34
			_hit_with_sword()
		elif weapon == 1 and bow_cooldown <= 0.0:
			arrows.append({"pos": hero.pos + Vector2(hero.facing * 28, -24), "vel": Vector2(hero.facing * 650, 0), "life": 2.0})
			bow_cooldown = 0.42

	hero.vel.y = min(hero.vel.y, 900.0)
	hero.pos += hero.vel * delta
	_resolve_platforms()
	_update_arrows(delta)
	_update_enemies(delta)
	_collect_runes()
	hero.invuln = max(hero.invuln - delta, 0.0)
	message_timer = max(message_timer - delta, 0.0)
	queue_redraw()

func _on_floor() -> bool:
	for platform in platforms:
		if hero.pos.x > platform.position.x - 18 and hero.pos.x < platform.end.x + 18 and abs(hero.pos.y + 35 - platform.position.y) < 5:
			return true
	return false

func _resolve_platforms() -> void:
	if hero.pos.y + 35 >= HEIGHT - 108:
		hero.pos.y = HEIGHT - 108 - 35
		hero.vel.y = 0
	for platform in platforms:
		if hero.pos.x > platform.position.x - 18 and hero.pos.x < platform.end.x + 18 and hero.vel.y >= 0 and hero.pos.y + 35 >= platform.position.y and hero.pos.y + 35 <= platform.position.y + 20:
			hero.pos.y = platform.position.y - 35
			hero.vel.y = 0
	hero.pos.x = clamp(hero.pos.x, 24.0, WIDTH - 24.0)

func _hit_with_sword() -> void:
	var hitbox := Rect2(hero.pos + Vector2(hero.facing * 18 - (24 if hero.facing < 0 else 0), -45), Vector2(48, 55))
	for enemy in enemies:
		if enemy.alive and hitbox.has_point(enemy.pos):
			enemy.alive = false

func _update_arrows(delta: float) -> void:
	for arrow in arrows:
		arrow.pos += arrow.vel * delta
		arrow.life -= delta
		for enemy in enemies:
			if enemy.alive and arrow.pos.distance_to(enemy.pos) < 34:
				enemy.alive = false
				arrow.life = 0
	arrows = arrows.filter(func(a): return a.life > 0 and a.pos.x > -20 and a.pos.x < WIDTH + 20)

func _update_enemies(delta: float) -> void:
	for enemy in enemies:
		if not enemy.alive:
			continue
		enemy.pos.x += enemy.dir * 35.0 * delta
		if enemy.pos.x < 20 or enemy.pos.x > WIDTH - 20:
			enemy.dir *= -1
		if hero.pos.distance_to(enemy.pos) < 38 and hero.invuln <= 0.0:
			if not (Input.is_action_pressed("block") and weapon == 2):
				hero.hp -= 1
				hero.invuln = 1.0
				message = "Você foi atingido!"
				message_timer = 1.2
				if hero.hp <= 0:
					hero.hp = 3
					hero.pos = Vector2(145, 470)
					message = "A jornada recomeça..."

func _collect_runes() -> void:
	for i in range(runes.size() - 1, -1, -1):
		if hero.pos.distance_to(runes[i]) < 40:
			runes.remove_at(i)
			collected += 1
			hero.armor = min(collected, 2)
			message = "Armadura recuperada: estágio " + str(hero.armor + 1) + "/3"
			message_timer = 3.0

func _draw() -> void:
	# Céu e camadas do cenário
	draw_rect(Rect2(0, 0, WIDTH, HEIGHT), Color("#10182c"))
	draw_circle(Vector2(935, 100), 62, Color("#f5d58a"))
	for i in range(8):
		var x := float(i * 180 - 40)
		draw_colored_polygon(PackedVector2Array([Vector2(x, 540), Vector2(x + 90, 330), Vector2(x + 210, 540)]), Color("#182844"))
	for platform in platforms:
		draw_rect(platform, Color("#513e35"))
		draw_rect(Rect2(platform.position, Vector2(platform.size.x, 7)), Color("#7eb35a"))
	for rune in runes:
		draw_circle(rune, 15, Color("#7de6ff"))
		draw_circle(rune, 8, Color("#e4ffff"))
	for enemy in enemies:
		if enemy.alive:
			_draw_enemy(enemy.pos)
	for arrow in arrows:
		draw_line(arrow.pos, arrow.pos - arrow.vel.normalized() * 18, Color("#e8c777"), 4)
	_draw_hero()
	_draw_ui()

func _draw_enemy(pos: Vector2) -> void:
	draw_circle(pos + Vector2(0, -11), 14, Color("#a83f4d"))
	draw_rect(Rect2(pos.x - 13, pos.y + 2, 26, 25), Color("#6b293b"))
	draw_circle(pos + Vector2(-5, -13), 3, Color.WHITE)
	draw_circle(pos + Vector2(5, -13), 3, Color.WHITE)
	draw_line(pos + Vector2(-10, 28), pos + Vector2(-15, 39), Color("#d18b55"), 4)
	draw_line(pos + Vector2(10, 28), pos + Vector2(15, 39), Color("#d18b55"), 4)

func _draw_hero() -> void:
	var p: Vector2 = hero.pos
	var flash: bool = hero.invuln > 0 and fmod(hero.invuln, 0.16) < 0.08
	if flash:
		return
	var armor_colors := [Color("#9b5b48"), Color("#d0d8df"), Color("#f0c45d")]
	var armor_color: Color = armor_colors[hero.armor]
	draw_circle(p + Vector2(0, -43), 15, Color("#d89568"))
	draw_colored_polygon(PackedVector2Array([p + Vector2(-18, -28), p + Vector2(18, -28), p + Vector2(14, 12), p + Vector2(-14, 12)]), armor_color)
	draw_rect(Rect2(p.x - 16, p.y + 10, 12, 25), Color("#343d5a"))
	draw_rect(Rect2(p.x + 4, p.y + 10, 12, 25), Color("#343d5a"))
	if hero.armor > 0:
		draw_arc(p + Vector2(0, -43), 18, PI, TAU, 12, armor_color, 5)
	if weapon == 2:
		draw_circle(p + Vector2(hero.facing * 24, -20), 18, Color("#4b8cb7"))
		draw_circle(p + Vector2(hero.facing * 24, -20), 13, Color("#8fd2de"))
	elif weapon == 1:
		draw_arc(p + Vector2(hero.facing * 17, -26), 18, -PI / 2, PI / 2, 12, Color("#c99a58"), 4)
		draw_line(p + Vector2(hero.facing * 17, -44), p + Vector2(hero.facing * 17, -8), Color("#e8d7ac"), 2)
	else:
		var blade_end := p + Vector2(hero.facing * (52 if attack_timer > 0 else 36), -32)
		draw_line(p + Vector2(hero.facing * 12, -20), blade_end, Color("#e9edf5"), 5)
		draw_line(p + Vector2(hero.facing * 8, -17), p + Vector2(hero.facing * 18, -27), Color("#b67a45"), 4)

func _draw_ui() -> void:
	draw_rect(Rect2(20, 18, 1112, 70), Color(0.03, 0.05, 0.1, 0.88))
	var font := ThemeDB.fallback_font
	draw_string(font, Vector2(38, 47), "VIDA DE HERÓI", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color("#f4d37d"))
	draw_string(font, Vector2(270, 44), "A/D mover   ESPAÇO saltar   J atacar   K disparar   L escudo   Q trocar", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("#d7e1ec"))
	draw_string(font, Vector2(38, 74), "♥ ".repeat(hero.hp) + "  Armadura: " + str(hero.armor + 1) + "/3  |  " + weapon_names[weapon], HORIZONTAL_ALIGNMENT_LEFT, -1, 17, Color("#ff8b82"))
	if message_timer > 0:
		draw_string(font, Vector2(350, 615), message, HORIZONTAL_ALIGNMENT_LEFT, -1, 19, Color("#ffffff"))
	if runes.is_empty():
		draw_string(font, Vector2(390, 120), "TODAS AS RUNAS ENCONTRADAS — A LENDA CONTINUA", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("#7de6ff"))

