const canvas = document.getElementById("textBubbles");
const ctx = canvas.getContext("2d");
const canvasContainer = document.getElementById("canvasContainer");


canvas.width = canvasContainer.clientWidth;
canvas.height = canvasContainer.clientHeight;

const GENERAL_CONFIG = {
    text: canvas.getAttribute('text') || 'Example Text',
    radius: parseInt(canvas.getAttribute('radius')) || 100,
    speed: parseInt(canvas.getAttribute('speed')) || 7,
    color: canvas.getAttribute('color') || '#111111',
    spacing: parseFloat(canvas.getAttribute('spacing')) || 0.05,
    maxWidth: parseInt(canvas.getAttribute('maxWidth')) || 500,
    fontSize: parseInt(canvas.getAttribute('fontSize')) || 50,
    font: canvas.getAttribute('font') || 'Arial',
    bubbleSpacing: parseInt(canvas.getAttribute('bubbleSpacing')) || 1,
    bubbleSize: parseFloat(canvas.getAttribute('bubbleSize')) || 1.2,
};

class Bubble {
    constructor(x, y, radius, fillColor, dx, dy) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.fillColor = fillColor;
        this.dx = dx;
        this.dy = dy;
        this.target = { x, y };
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.fillColor;
        ctx.fill();
    }

    update(mouse) {
        let dx = this.x - mouse.x;
        let dy = this.y - mouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let minDistance = GENERAL_CONFIG.radius;

        if (distance < minDistance) {
            this.x += this.dx;
            this.y += this.dy;
        } else {
            this.x += (this.target.x - this.x) * GENERAL_CONFIG.spacing;
            this.y += (this.target.y - this.y) * GENERAL_CONFIG.spacing;
        }
    }
}

let bubbles = [];

function adjustFontSize() {
    const maxWidth = canvas.width * 0.8; // Use up to 80% of the canvas width
    let fontSize = 50;
    ctx.font = `${fontSize}px Arial`;

    let textWidth;
    do {
        textWidth = ctx.measureText(GENERAL_CONFIG.text).width;
        if (textWidth > maxWidth) {
            fontSize -= 1;
            ctx.font = `${fontSize}px Arial`;
        }
    } while (textWidth > maxWidth);
}

function createBubbles() {
    bubbles = [];
    let text = GENERAL_CONFIG.text;
    ctx.font = `${GENERAL_CONFIG.fontSize}px ${GENERAL_CONFIG.font}`;
    adjustFontSize();
    let textWidth = ctx.measureText(text).width;
    let x = (canvas.width - textWidth) / 2;
    let y = canvas.height / 2;

    ctx.fillText(text, x, y);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < canvas.width; i += GENERAL_CONFIG.bubbleSpacing) {
        for (let j = 0; j < canvas.height; j += GENERAL_CONFIG.bubbleSpacing) {
            if (imageData.data[(i + j * canvas.width) * 4 + 3] > 128) {
                let radius = GENERAL_CONFIG.bubbleSize;
                let dx = (Math.random() - 0.5) * GENERAL_CONFIG.speed;
                let dy = (Math.random() - 0.5) * GENERAL_CONFIG.speed;
                let bubble = new Bubble(i, j, radius, GENERAL_CONFIG.color, dx, dy);
                bubbles.push(bubble);
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let bubble of bubbles) {
        bubble.update(mouse);
        bubble.draw();
    }

    requestAnimationFrame(animate);
}

let mouse = {
    x: undefined,
    y: undefined,
};

canvas.addEventListener("mousemove", (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

canvas.addEventListener("mouseleave", () => {
    mouse.x = undefined;
    mouse.y = undefined;
});

window.addEventListener("resize", () => {
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
    createBubbles();
});

createBubbles();
animate();
