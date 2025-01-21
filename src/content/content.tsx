import React, { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Bot,
  Copy,
  EllipsisVertical,
  Eraser,
  Send,
  Settings,
} from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { Input } from '@/components/ui/input'
import { SYSTEM_PROMPT } from '@/constants/prompt'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { ModalService } from '@/services/ModalService'
import { useChromeStorage } from '@/hooks/useChromeStorage'
import { ChatHistory, parseChatHistory } from '@/interface/chatHistory'
import { VALID_MODELS, ValidModel } from '@/constants/valid_modals'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createChatSession } from '@/lib/indexedDB'
import { useIndexDB } from '@/hooks/useIndexDB'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatBoxProps {
  visible: boolean
  model: ValidModel
  apikey: string
  heandelModel: (v: ValidModel) => void
  selectedModel: ValidModel | undefined
}

const ChatBox: React.FC<ChatBoxProps> = ({
  visible,
  model,
  apikey,
  heandelModel,
  selectedModel,
}) => {
  const [sessionId, setSessionId] = React.useState<string>('')
  const [value, setValue] = React.useState('')
  const [chatHistory, setChatHistory] = React.useState<ChatHistory[]>([])
  const [priviousChatHistory, setPreviousChatHistory] = React.useState<
    ChatHistory[]
  >([])
  const [isResponseLoading, setIsResponseLoading] =
    React.useState<boolean>(false)
  // const chatBoxRef = useRef<HTMLDivElement>(null)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)

  const [offset, setOffset] = React.useState<number>(0)
  const [screenshot, setScreenshot] = React.useState<string>('')
  const [totalMessages, setTotalMessages] = React.useState<number>(0)
  const [isPriviousMsgLoading, setIsPriviousMsgLoading] =
    React.useState<boolean>(false)

  const inputFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const initializeSession = async () => {
      const newSessionId = await createChatSession('rohit')
      setSessionId(newSessionId)
    }
    if (lastMessageRef.current && !isPriviousMsgLoading) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    setTimeout(() => {
      inputFieldRef.current?.focus()
    }, 0)

    initializeSession()
  }, [chatHistory, isResponseLoading, visible])

  const heandelClearChat = async () => {
    const { clearChatHistory } = useIndexDB()
    await clearChatHistory(sessionId)
    setChatHistory([])
    setPreviousChatHistory([])
  }

  /**
   * Handles the generation of an AI response.
   *
   * This function performs the following steps:
   * 1. Initializes a new instance of `ModalService`.
   * 2. Selects a modal using the provided model and API key.
   * 3. Determines the programming language from the UI.
   * 4. Extracts the user's current code from the document.
   * 5. Modifies the system prompt with the problem statement, programming language, and extracted code.
   * 6. Generates a response using the modified system prompt.
   * 7. Updates the chat history with the generated response or error message.
   * 8. Scrolls the chat box into view.
   *
   * @async
   * @function handleGenerateAIResponse
   * @returns {Promise<void>} A promise that resolves when the AI response generation is complete.
   */
  const handleGenerateAIResponse = async (): Promise<void> => {
    console.log('Generating AI response...')
    setIsResponseLoading(true) // Indicate loading to the user

    const capturedScreenshot = await new Promise<string | null>((resolve) => {
      chrome.runtime
        .sendMessage({ action: 'captureTab' })
        .then((response) => {
          resolve(response.image) // Resolve the promise with the image
        })
        .catch((error) => {
          console.error('Error capturing tab:', error)
          resolve(null) // Resolve with null on error
        })
    })

    if (capturedScreenshot) {
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        try {
          if (capturedScreenshot != null) {
            const base64Data = capturedScreenshot.replace(
              /^data:image\/png;base64,/,
              ''
            )
            console.log('Base64 data:', base64Data);
            
            const binaryString = window.atob(base64Data)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'image/png' })
            resolve(blob)
          }
        } catch (error) {
          console.error('Error converting Base64 to Blob:', error)
          resolve(null)
        }
      })
      console.error('Screenshot capture failed.')
      setIsResponseLoading(false)
      if (pngBlob) {
        const pngUrl = URL.createObjectURL(pngBlob)
        console.log('Screenshot URL:', pngUrl)
      }
    }

    // Set the screenshot state and wait for it to complete

    // console.log('Screenshot is ' + screenshot)

    const modalService = new ModalService()

    modalService.selectModal(model, apikey)

    const systemPromptModified = SYSTEM_PROMPT

    const PCH = parseChatHistory(chatHistory)

    const { error, success } = await modalService.generate({
      prompt: `${value}`,
      systemPrompt: systemPromptModified,
      messages: PCH,
      screenshot: screenshot,
    })

    if (error) {
    console.log('Error is ' + error)
      const errorMessage: ChatHistory = {
        role: 'assistant',
        content: error.message,
      }

      setChatHistory((prev) => [...prev, errorMessage])
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (success) {
    console.log('Success is ' + success)
      const res: ChatHistory = {
        role: 'assistant',
        content: success,
      }
      setChatHistory((prev) => [...prev, res])
      setValue('')
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })

      setPreviousChatHistory((prev) => [...prev, res])
      setChatHistory((prev) => [...prev, res])
      setValue('')
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    setIsResponseLoading(false)
    setTimeout(() => {
      inputFieldRef.current?.focus()
    }, 0)
  }

  const onSendMessage = async (value: string) => {
    setIsResponseLoading(true)
    const newMessage: ChatHistory = { role: 'user', content: value }

    setPreviousChatHistory((prev) => {
      return [...prev, newMessage]
    })
    setChatHistory([...chatHistory, newMessage])

    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' })
    handleGenerateAIResponse()
  }

  if (!visible) return <></>

  return (
    <Card className="mb-2 ">
      <div className="flex gap-2 items-center justify-between h-20 rounded-t-lg p-4">
        <div className="flex gap-2 items-center justify-start">
          <div className="bg-white rounded-full p-2">
            <Bot color="#000" className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Need Help?</h3>
            <h6 className="font-normal text-xs">Always online</h6>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="tertiary" size={'icon'}>
              <EllipsisVertical size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel className="flex items-center">
              <Settings size={16} strokeWidth={1.5} className="mr-2" />{' '}
              {
                VALID_MODELS.find((model) => model.name === selectedModel)
                  ?.display
              }
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Bot size={16} strokeWidth={1.5} /> Change Model
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={selectedModel}
                      onValueChange={(v) => heandelModel(v as ValidModel)}
                    >
                      {VALID_MODELS.map((modelOption) => (
                        <DropdownMenuRadioItem
                          key={modelOption.name}
                          value={modelOption.name}
                        >
                          {modelOption.display}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={heandelClearChat}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  'rgb(185 28 28 / 0.35)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
            >
              <Eraser size={14} strokeWidth={1.5} /> Clear Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="p-2">
        {chatHistory.length > 0 ? (
          <ScrollArea
            className="space-y-4 h-[500px] w-[400px] p-2"
            ref={scrollAreaRef}
          >
            {totalMessages > offset && (
              <div className="flex w-full items-center justify-center">
                <Button className="text-sm p-1 m-x-auto bg-transpernent text-white hover:bg-transpernent">
                  Load Previous Messages
                </Button>
              </div>
            )}
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex w-max max-w-[75%] flex-col gap-2 px-3 py-2 text-sm my-4',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground rounded-bl-lg rounded-tl-lg rounded-tr-lg '
                    : 'bg-muted rounded-br-lg rounded-tl-lg rounded-tr-lg'
                )}
              >
                <>
                  <p className="max-w-80">
                    {typeof message.content === 'string'
                      ? message.content
                      : message.content.feedback}
                  </p>

                  {!(typeof message.content === 'string') && (
                    <Accordion type="multiple">
                      {message.content?.hints &&
                        message.content.hints.length > 0 && (
                          <AccordionItem value="item-1" className="max-w-80">
                            <AccordionTrigger>Hints 👀</AccordionTrigger>
                            <AccordionContent>
                              <ul className="space-y-4">
                                {message.content?.hints?.map((e) => (
                                  <li key={e}>{e}</li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      {message.content?.snippet && (
                        <AccordionItem value="item-2" className="max-w-80">
                          <AccordionTrigger>Code 🧑🏻‍💻</AccordionTrigger>

                          <AccordionContent>
                            <div className="mt-4 rounded-md">
                              <div className="relative">
                                <Copy
                                  onClick={() => {
                                    if (typeof message.content !== 'string')
                                      navigator.clipboard.writeText(
                                        `${message.content?.snippet}`
                                      )
                                  }}
                                  className="absolute right-2 top-2 h-4 w-4"
                                />
                                <Highlight
                                  theme={themes.dracula}
                                  code={message.content?.snippet || ''}
                                  language={'javascript'}
                                >
                                  {({
                                    className,
                                    style,
                                    tokens,
                                    getLineProps,
                                    getTokenProps,
                                  }) => (
                                    <pre
                                      style={style}
                                      className={cn(
                                        className,
                                        'p-3 rounded-md'
                                      )}
                                    >
                                      {tokens.map((line, i) => (
                                        <div
                                          key={i}
                                          {...getLineProps({ line })}
                                        >
                                          {line.map((token, key) => (
                                            <span
                                              key={key}
                                              {...getTokenProps({ token })}
                                            />
                                          ))}
                                        </div>
                                      ))}
                                    </pre>
                                  )}
                                </Highlight>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  )}
                </>
              </div>
            ))}
            {isResponseLoading && (
              <div className={'flex w-max max-w-[75%] flex-col my-2'}>
                <div className="w-5 h-5 rounded-full animate-pulse bg-primary"></div>
              </div>
            )}
            <div ref={lastMessageRef} />
          </ScrollArea>
        ) : (
          <div>
            <p className="flex items-center justify-center h-[510px] w-[400px] text-center space-y-4">
              No messages yet.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (value.trim().length === 0) return
            onSendMessage(value)
            setValue('')
          }}
          className="flex w-full items-center space-x-2"
        >
          <Input
            id="message"
            placeholder="Type your message..."
            className="flex-1"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={isResponseLoading}
            required
            ref={inputFieldRef}
          />
          <Button
            type="submit"
            className="bg-[#fafafa] rounded-lg text-black"
            size="icon"
            disabled={value.length === 0}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

const ContentPage: React.FC = () => {
  const [chatboxExpanded, setChatboxExpanded] = React.useState<boolean>(false)
  const [modal, setModal] = React.useState<ValidModel | null | undefined>(null)
  const [apiKey, setApiKey] = React.useState<string | null | undefined>(null)
  const [selectedModel, setSelectedModel] = React.useState<ValidModel>()

  const ref = useRef<HTMLDivElement>(null)

  const handleDocumentClick = (e: MouseEvent) => {
    if (
      ref.current &&
      e.target instanceof Node &&
      !ref.current.contains(e.target)
    ) {
      // if (chatboxExpanded) setChatboxExpanded(false)
    }
  }

  React.useEffect(() => {
    document.addEventListener('click', handleDocumentClick)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [])
  ;(async () => {
    const { getKeyModel, selectModel } = useChromeStorage()
    const { model, apiKey } = await getKeyModel(await selectModel())

    setModal(model)
    setApiKey(apiKey)
  })()

  const heandelModel = (v: ValidModel) => {
    if (v) {
      const { setSelectModel } = useChromeStorage()
      setSelectModel(v)
      setSelectedModel(v)
    }
  }

  React.useEffect(() => {
    const loadChromeStorage = async () => {
      if (!chrome) return

      const { selectModel } = useChromeStorage()

      setSelectedModel(await selectModel())
    }

    loadChromeStorage()
  }, [])

  return (
    <div
      ref={ref}
      className="dark z-50"
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
      }}
    >
      {!modal || !apiKey ? (
        !chatboxExpanded ? null : (
          <>
            <Card className="mb-5">
              <CardContent className="h-[500px] grid place-items-center">
                <div className="grid place-items-center gap-4">
                  {!selectedModel && (
                    <>
                      <p className="text-center">
                        Please configure the extension before using this
                        feature.
                      </p>
                      <Button
                        onClick={() => {
                          chrome.runtime.sendMessage({ action: 'openPopup' })
                        }}
                      >
                        configure
                      </Button>
                    </>
                  )}
                  {selectedModel && (
                    <>
                      <p>
                        We couldn't find any API key for selected model{' '}
                        <b>
                          <u>{selectedModel}</u>
                        </b>
                      </p>
                      <p>you can select another models</p>
                      <Select
                        onValueChange={(v: ValidModel) => heandelModel(v)}
                        value={selectedModel}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Model</SelectLabel>
                            <SelectSeparator />
                            {VALID_MODELS.map((modelOption) => (
                              <SelectItem
                                key={modelOption.name}
                                value={modelOption.name}
                              >
                                {modelOption.display}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )
      ) : (
        <ChatBox
          visible={chatboxExpanded}
          model={modal}
          apikey={apiKey}
          heandelModel={heandelModel}
          selectedModel={selectedModel}
        />
      )}
      <div className="flex justify-end">
        <Button
          size={'icon'}
          onClick={() => setChatboxExpanded(!chatboxExpanded)}
        >
          <Bot />
        </Button>
      </div>
    </div>
  )
}

export default ContentPage
