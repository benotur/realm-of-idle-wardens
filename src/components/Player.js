class Player {
    constructor(name) {
        this.name = name;
        this.level = 1;
        this.resources = {
            gold: 0,
            wood: 0,
            stone: 0
        };
        this.upgradeCost = {
            gold: 100,
            wood: 50,
            stone: 30
        };
    }

    collectResources(resourceType, amount) {
        if (this.resources[resourceType] !== undefined) {
            this.resources[resourceType] += amount;
        }
    }

    upgrade() {
        if (this.canUpgrade()) {
            this.level++;
            this.resources.gold -= this.upgradeCost.gold;
            this.resources.wood -= this.upgradeCost.wood;
            this.resources.stone -= this.upgradeCost.stone;
            this.updateUpgradeCost();
        }
    }

    canUpgrade() {
        return this.resources.gold >= this.upgradeCost.gold &&
               this.resources.wood >= this.upgradeCost.wood &&
               this.resources.stone >= this.upgradeCost.stone;
    }

    updateUpgradeCost() {
        this.upgradeCost.gold *= 1.2;
        this.upgradeCost.wood *= 1.2;
        this.upgradeCost.stone *= 1.2;
    }

    getResources() {
        return this.resources;
    }

    getLevel() {
        return this.level;
    }
}

export default Player;