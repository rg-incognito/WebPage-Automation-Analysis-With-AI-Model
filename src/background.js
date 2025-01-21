chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message)

  switch (message.action) {
    case 'openPopup':
      chrome.action.openPopup()
      break

    case 'captureTab':
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error capturing tab:',
            chrome.runtime.lastError.message
          )
          sendResponse({ error: chrome.runtime.lastError.message })
        } else {
          console.log('Captured tab image:', dataUrl)
          const base64Image = dataUrl.split(',')[1] // Extract Base64 part
          console.log('Base64 image length:', base64Image.length) // Log length for verification
          sendResponse({ image: base64Image }) // Send only the Base64 string
        }
      })
      return true // Keep the message channel open for async response.

    default:
      console.warn('Unknown action:', message.action)
      break
  }
})
