class Enemy {
    constructor(name, health, speed) {
        this.name = name;
        this.health = health;
        this.speed = speed;
        this.position = { x: 0, y: 0 };
    }

    move() {
        // Logic for enemy movement
        this.position.x += this.speed;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // Logic for enemy death
        console.log(`${this.name} has been defeated!`);
    }

    attack(player) {
        // Logic for attacking the player
        console.log(`${this.name} attacks the player!`);
    }
}

export default Enemy;