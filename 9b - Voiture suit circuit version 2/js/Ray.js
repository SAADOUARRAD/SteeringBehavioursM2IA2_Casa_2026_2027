/**
 * Ray.js
 * Rayon capteur laser pour la détection des murs et des limites de piste.
 */

class Ray {
    constructor(pos, angle) {
        if (typeof createVector === 'function') {
            this.pos = pos ? pos.copy() : createVector(0, 0);
            this.dir = p5.Vector.fromAngle(angle || 0);
        } else {
            this.pos = pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 };
            this.dir = { x: Math.cos(angle || 0), y: Math.sin(angle || 0) };
        }
        this.end = null;
        this.hitFraction = 1.0; // 1 = voie libre, 0 = collision immédiate
    }

    setPos(x, y) {
        this.pos.x = x;
        this.pos.y = y;
    }

    setDir(angle) {
        if (typeof p5 !== 'undefined' && p5.Vector && p5.Vector.fromAngle) {
            this.dir = p5.Vector.fromAngle(angle);
        } else {
            this.dir = { x: Math.cos(angle), y: Math.sin(angle) };
        }
    }

    lookAt(x, y) {
        this.dir.x = x - this.pos.x;
        this.dir.y = y - this.pos.y;
        const mag = Math.hypot(this.dir.x, this.dir.y);
        if (mag > 0) {
            this.dir.x /= mag;
            this.dir.y /= mag;
        }
    }

    cast(wall) {
        if (!wall || !wall.a || !wall.b) return null;

        const x1 = wall.a.x;
        const y1 = wall.a.y;
        const x2 = wall.b.x;
        const y2 = wall.b.y;

        const x3 = this.pos.x;
        const y3 = this.pos.y;
        const x4 = this.pos.x + this.dir.x;
        const y4 = this.pos.y + this.dir.y;

        const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(den) < 1e-7) {
            return null;
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

        if (t >= 0 && t <= 1 && u > 0) {
            const rx = x1 + t * (x2 - x1);
            const ry = y1 + t * (y2 - y1);
            if (typeof createVector === 'function') {
                return createVector(rx, ry);
            }
            return { x: rx, y: ry };
        }
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Ray };
}
