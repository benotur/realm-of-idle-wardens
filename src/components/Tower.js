class Tower {
    constructor(name, damage, range) {
        this.name = name;
        this.damage = damage;
        this.range = range;
        this.level = 1;
        this.upgradeCost = 100; // Example cost for upgrading
    }

    attack(enemy) {
        if (this.isInRange(enemy)) {
            enemy.takeDamage(this.damage);
            console.log(`${this.name} attacks ${enemy.name} for ${this.damage} damage!`);
        } else {
            console.log(`${enemy.name} is out of range for ${this.name}.`);
        }
    }

    isInRange(enemy) {
        // Placeholder for range checking logic
        return true; // Assume always in range for simplicity
    }

    upgrade() {
        this.level++;
        this.damage += 10; // Increase damage on upgrade
        this.upgradeCost *= 1.5; // Increase cost for next upgrade
        console.log(`${this.name} upgraded to level ${this.level}.`);
    }
}

export default Tower;