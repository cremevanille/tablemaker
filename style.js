const cssPropName = (str) => '--'+str.replaceAll(/[A-Z]/g, c => '-'+c.toLowerCase())

export default new Proxy({
  rem: parseFloat(window.getComputedStyle(document.documentElement, null).getPropertyValue('font-size'))
}, {
  get(t, p, r) {
    if (!Reflect.has(t, p)) {
      const s = getComputedStyle(document.documentElement, null).getPropertyValue(cssPropName(p))
      const v = s.endsWith('px') ? parseFloat(s)
        : s.endsWith('rem') ? parseFloat(s) * t.rem
        : s
      Reflect.set(t, p, v)
    }
    return Reflect.get(t, p)
  },
  set(t, p, v, r) {
    document.documentElement.style.setProperty(cssPropName(p), v);
    return Reflect.set(t, p, v, r)
  }
})
