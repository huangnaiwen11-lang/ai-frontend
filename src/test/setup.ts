import '@testing-library/jest-dom/vitest'

// jsdom 无原生模态方法；真实焦点约束与背景隔离由 Playwright 验收。
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
}
