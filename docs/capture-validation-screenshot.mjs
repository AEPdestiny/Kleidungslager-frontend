import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const edgePath =
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const screenshotPath = resolve(
  projectRoot,
  'docs/screenshots/usecase-04-eingaben-validieren.png',
)
const userDataDir = resolve(projectRoot, 'docs/.edge-validation-profile')
const port = 9337

let messageId = 1

async function waitForDebuggerUrl() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      const data = await response.json()
      return data.webSocketDebuggerUrl
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 200))
    }
  }

  throw new Error('Edge DevTools konnte nicht erreicht werden.')
}

function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  const pending = new Map()

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve: resolvePending, reject } = pending.get(message.id)
      pending.delete(message.id)

      if (message.error !== undefined) {
        reject(new Error(message.error.message))
      } else {
        resolvePending(message.result)
      }
    }
  })

  return {
    ready: new Promise((resolveReady) => {
      socket.addEventListener('open', resolveReady, { once: true })
    }),
    send(method, params = {}, sessionId) {
      const id = messageId
      messageId += 1

      socket.send(JSON.stringify({
        id,
        method,
        params,
        ...(sessionId === undefined ? {} : { sessionId }),
      }))

      return new Promise((resolveSend, reject) => {
        pending.set(id, {
          resolve: resolveSend,
          reject,
        })
      })
    },
    close() {
      socket.close()
    },
  }
}

async function main() {
  await mkdir(dirname(screenshotPath), { recursive: true })
  await rm(userDataDir, { recursive: true, force: true })

  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,720',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], {
    stdio: 'ignore',
  })

  try {
    const debuggerUrl = await waitForDebuggerUrl()
    const client = createClient(debuggerUrl)
    await client.ready

    const { targetId } = await client.send('Target.createTarget', {
      url: 'about:blank',
    })
    const { sessionId } = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    })

    await client.send('Page.enable', {}, sessionId)
    await client.send('Runtime.enable', {}, sessionId)

    await client.send('Page.navigate', {
      url: 'http://127.0.0.1:5173/login',
    }, sessionId)
    await new Promise((resolveWait) => setTimeout(resolveWait, 1800))

    await client.send('Runtime.evaluate', {
      expression: `
        const email = document.querySelector('input[type="email"]');
        const passwort = document.querySelector('input[type="password"]');
        const inputSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        ).set;
        if (email) {
          inputSetter.call(email, 'Ibrahim.Danisman@Student.HTW-Berlin.de');
          email.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passwort) {
          inputSetter.call(passwort, 'demo');
          passwort.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const loginForm = document.querySelector('form.login-form');
        if (loginForm) {
          loginForm.dispatchEvent(new Event('submit', {
            bubbles: true,
            cancelable: true
          }));
        }
      `,
    }, sessionId)
    await new Promise((resolveWait) => setTimeout(resolveWait, 3000))

    await client.send('Runtime.evaluate', {
      expression: `
        const form = document.querySelector('form.formular');
        if (form) {
          const bezeichnung = form.querySelector('input[required]');
          const farbe = Array.from(form.querySelectorAll('input[required]'))[1];
          if (bezeichnung) {
            bezeichnung.value = '';
            bezeichnung.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (farbe) {
            farbe.value = '';
            farbe.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const button = form.querySelector('button[type="submit"]');
          if (button) {
            button.click();
          }
        }
      `,
    }, sessionId)
    await new Promise((resolveWait) => setTimeout(resolveWait, 900))

    await new Promise((resolveWait) => setTimeout(resolveWait, 800))

    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
    }, sessionId)

    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'))
    client.close()
  } finally {
    edge.kill()
    try {
      await rm(userDataDir, { recursive: true, force: true })
    } catch {
      // Edge may release profile journal files a little later.
    }
  }
}

await main()
