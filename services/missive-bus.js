class MissiveBus extends EventTarget {
  emit(type, text) {
    this.dispatchEvent(
      new CustomEvent('missive', {
        detail: { type, text }
      })
    );
  }

  success(text) { this.emit('success', text); }
  warning(text) { this.emit('warning', text); }
  error(text) { this.emit('error', text); }
  info(text) { this.emit('info', text); }
}

export const missiveBus = new MissiveBus();