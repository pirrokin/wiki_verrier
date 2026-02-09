
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&";

class LetterGlitch {
    constructor(elementId) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = elementId;
        document.body.prepend(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.fontSize = 16;
        this.columns = Math.ceil(this.width / this.fontSize);
        this.rows = Math.ceil(this.height / this.fontSize);

        this.grid = [];
        this.initGrid();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(document.body);

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initGrid() {
        this.grid = [];
        for (let i = 0; i < this.columns; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.rows; j++) {
                this.grid[i][j] = {
                    char: chars[Math.floor(Math.random() * chars.length)],
                    alpha: Math.random() * 0.5 + 0.1 // Random initial opacity
                };
            }
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.columns = Math.ceil(this.width / this.fontSize);
        this.rows = Math.ceil(this.height / this.fontSize);
        this.initGrid();
    }

    draw() {
        // Clear with very slight transparency to leave trails? No, for letter glitch we usually redraw.
        this.ctx.fillStyle = '#050508'; // Very dark background
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.font = `${this.fontSize}px 'Courier New', monospace`;

        for (let i = 0; i < this.columns; i++) {
            for (let j = 0; j < this.rows; j++) {
                const cell = this.grid[i][j];

                // Randomly change character
                if (Math.random() > 0.98) {
                    cell.char = chars[Math.floor(Math.random() * chars.length)];
                }

                // Randomly change opacity "flicker"
                if (Math.random() > 0.95) {
                    cell.alpha = Math.random() * 0.5 + 0.1;
                }

                // Color based on "glitch"
                // Color based on "glitch"
                if (Math.random() > 0.995) {
                    this.ctx.fillStyle = '#e0aaff'; // Flash bright lavender
                } else if (Math.random() > 0.98) {
                    this.ctx.fillStyle = '#7b2cbf'; // Occasional deep purple
                } else {
                    // Base text: Purple with alpha
                    this.ctx.fillStyle = `rgba(157, 78, 221, ${cell.alpha})`;
                }

                this.ctx.fillText(cell.char, i * this.fontSize, j * this.fontSize + this.fontSize);
            }
        }
    }

    animate() {
        // Slow down animation loop (~15 FPS)
        setTimeout(() => {
            requestAnimationFrame(this.animate);
        }, 80);

        this.draw();
    }
}

// Start effect on load
document.addEventListener('DOMContentLoaded', () => {
    new LetterGlitch('glitchCanvas');
    console.log("Letter Glitch Initialized");
});
