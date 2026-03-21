/**
 * 轻量补间动画系统
 */

export type EaseFunc = (t: number) => number;

export const Ease = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutBack: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

interface TweenConfig {
  target: any;
  props: Record<string, number>;
  duration: number;
  ease?: EaseFunc;
  delay?: number;
  onUpdate?: () => void;
  onComplete?: () => void;
}

interface ActiveTween {
  config: TweenConfig;
  startValues: Record<string, number>;
  elapsed: number;
  delayRemaining: number;
}

class TweenManagerClass {
  private _tweens: ActiveTween[] = [];

  to(config: TweenConfig): ActiveTween {
    const startValues: Record<string, number> = {};
    for (const key in config.props) {
      startValues[key] = config.target[key] ?? 0;
    }
    const tween: ActiveTween = { config, startValues, elapsed: 0, delayRemaining: config.delay || 0 };
    this._tweens.push(tween);
    return tween;
  }

  cancel(tween: ActiveTween): void {
    const idx = this._tweens.indexOf(tween);
    if (idx !== -1) this._tweens.splice(idx, 1);
  }

  cancelTarget(target: any): void {
    this._tweens = this._tweens.filter(t => t.config.target !== target);
  }

  update(dt: number): void {
    const completed: ActiveTween[] = [];
    for (const tween of this._tweens) {
      if (tween.delayRemaining > 0) { tween.delayRemaining -= dt; continue; }
      tween.elapsed += dt;
      const { config, startValues } = tween;
      const ease = config.ease || Ease.linear;
      const progress = Math.min(tween.elapsed / config.duration, 1);
      const ep = ease(progress);
      for (const key in config.props) {
        config.target[key] = startValues[key] + (config.props[key] - startValues[key]) * ep;
      }
      config.onUpdate?.();
      if (progress >= 1) completed.push(tween);
    }
    for (const tween of completed) {
      const idx = this._tweens.indexOf(tween);
      if (idx !== -1) this._tweens.splice(idx, 1);
      tween.config.onComplete?.();
    }
  }

  get activeCount(): number { return this._tweens.length; }
}

export const TweenManager = new TweenManagerClass();
