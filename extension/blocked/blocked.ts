const params = new URLSearchParams(window.location.search)
const domain = params.get('domain')

if (domain) {
  document.getElementById('retry-btn')!.addEventListener('click', () => {
    window.location.href = `https://${domain}`
  })
}
