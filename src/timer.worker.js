let interval = null

self.onmessage = ({ data }) => {
  if (data === 'start') {
    clearInterval(interval)
    interval = setInterval(() => self.postMessage('tick'), 500)
  } else if (data === 'stop') {
    clearInterval(interval)
    interval = null
  }
}
