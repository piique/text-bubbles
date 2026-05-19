import type { Bubble, MousePosition, TextBubblesConfig, TextBubblesState } from '../types';

const DEFAULT_CONFIG: Required<Omit<TextBubblesConfig, 'onMouseEnter' | 'onMouseLeave'>> = {
  text: 'Example Text',
  radius: 100,
  speed: 7,
  color: '#111111',
  spacing: 0.05,
  maxWidth: 500,
  fontSize: 50,
  font: 'Arial',
  bubbleSpacing: 1,
  bubbleSize: 1.2,
};

function createBubble(
  x: number,
  y: number,
  radius: number,
  fillColor: string,
  dx: number,
  dy: number,
): Bubble {
  return { x, y, radius, fillColor, dx, dy, target: { x, y } };
}

function adjustFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasWidth: number,
  baseFontSize: number,
  font: string,
): number {
  const maxWidth = canvasWidth * 0.8;
  let fontSize = baseFontSize;
  ctx.font = `${fontSize}px ${font}`;

  let textWidth = ctx.measureText(text).width;
  while (textWidth > maxWidth && fontSize > 8) {
    fontSize -= 1;
    ctx.font = `${fontSize}px ${font}`;
    textWidth = ctx.measureText(text).width;
  }
  return fontSize;
}

function extractBubblesFromImageData(
  imageData: ImageData,
  canvasWidth: number,
  canvasHeight: number,
  config: TextBubblesState['config'],
): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let i = 0; i < canvasWidth; i += config.bubbleSpacing) {
    for (let j = 0; j < canvasHeight; j += config.bubbleSpacing) {
      const alpha = imageData.data[(i + j * canvasWidth) * 4 + 3];
      if (alpha > 128) {
        const dx = (Math.random() - 0.5) * config.speed;
        const dy = (Math.random() - 0.5) * config.speed;
        bubbles.push(createBubble(i, j, config.bubbleSize, config.color, dx, dy));
      }
    }
  }
  return bubbles;
}

function createBubbles(state: TextBubblesState): void {
  const { ctx, canvas, config } = state;
  state.bubbles = [];

  const effectiveFontSize = adjustFontSize(
    ctx,
    config.text,
    canvas.width,
    config.fontSize,
    config.font,
  );

  ctx.font = `${effectiveFontSize}px ${config.font}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = config.color;
  const textWidth = ctx.measureText(config.text).width;
  const x = (canvas.width - textWidth) / 2;
  const y = canvas.height / 2;

  ctx.fillText(config.text, x, y);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  state.bubbles = extractBubblesFromImageData(imageData, canvas.width, canvas.height, config);
}

function updateBubble(bubble: Bubble, mouse: MousePosition, config: TextBubblesState['config']): void {
  if (mouse.x === undefined || mouse.y === undefined) {
    bubble.x += (bubble.target.x - bubble.x) * config.spacing;
    bubble.y += (bubble.target.y - bubble.y) * config.spacing;
    return;
  }

  const dx = bubble.x - mouse.x;
  const dy = bubble.y - mouse.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < config.radius) {
    bubble.x += bubble.dx;
    bubble.y += bubble.dy;
  } else {
    bubble.x += (bubble.target.x - bubble.x) * config.spacing;
    bubble.y += (bubble.target.y - bubble.y) * config.spacing;
  }
}

function drawBubble(ctx: CanvasRenderingContext2D, bubble: Bubble): void {
  ctx.beginPath();
  ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2, false);
  ctx.fillStyle = bubble.fillColor;
  ctx.fill();
}

function animate(state: TextBubblesState): void {
  if (!state.running) return;

  const { ctx, canvas } = state;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const bubble of state.bubbles) {
    updateBubble(bubble, state.mouse, state.config);
    drawBubble(ctx, bubble);
  }

  state.animationId = requestAnimationFrame(() => animate(state));
}

export function initTextBubbles(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  userConfig: TextBubblesConfig,
): TextBubblesState {
  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width) || container.clientWidth || 300;
  const height = Math.floor(rect.height) || container.clientHeight || 200;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2d context from canvas');

  const config = {
    ...DEFAULT_CONFIG,
    ...Object.fromEntries(
      Object.entries(userConfig).filter(([, v]) => v !== undefined)
    ),
  };

  const state: TextBubblesState = {
    bubbles: [],
    canvas,
    ctx,
    config,
    mouse: { x: undefined, y: undefined },
    animationId: null,
    running: false,
  };

  createBubbles(state);
  return state;
}

export function startAnimation(state: TextBubblesState): void {
  if (state.running) return;
  state.running = true;
  animate(state);
}

export function stopAnimation(state: TextBubblesState): void {
  state.running = false;
  if (state.animationId !== null) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
}

export function handleMouseMove(state: TextBubblesState, x: number, y: number): void {
  state.mouse.x = x;
  state.mouse.y = y;
}

export function handleMouseLeave(state: TextBubblesState): void {
  state.mouse.x = undefined;
  state.mouse.y = undefined;
}

export function handleResize(state: TextBubblesState, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  state.canvas.width = rect.width || container.clientWidth || 300;
  state.canvas.height = rect.height || container.clientHeight || 200;
  const freshCtx = state.canvas.getContext('2d', { willReadFrequently: true });
  if (freshCtx) {
    state.ctx = freshCtx;
  }
  createBubbles(state);
}

export function destroyTextBubbles(state: TextBubblesState): void {
  stopAnimation(state);
  state.bubbles = [];
}