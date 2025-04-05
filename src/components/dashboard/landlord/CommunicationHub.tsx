"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Send, Paperclip, Phone, Video, Search, ChevronRight, Image, FileText, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function CommunicationHub() {
  const [activeTab, setActiveTab] = useState("messages")
  const [selectedChat, setSelectedChat] = useState(1)
  const [messageText, setMessageText] = useState("")

  // Mock data for chats
  const chats = [
    {
      id: 1,
      name: "John Tenant",
      property: "123 Main St, Apt 4B",
      lastMessage: "When will the plumber arrive?",
      time: "10:30 AM",
      unread: 2,
      avatar: "/placeholder.svg?height=40&width=40",
      online: true,
    },
    {
      id: 2,
      name: "Sarah Renter",
      property: "456 Park Ave",
      lastMessage: "Thanks for fixing the issue so quickly!",
      time: "Yesterday",
      unread: 0,
      avatar: "/placeholder.svg?height=40&width=40",
      online: false,
    },
    {
      id: 3,
      name: "Mike Occupant",
      property: "789 Oak Rd",
      lastMessage: "I'll be moving out on April 30th as planned.",
      time: "2 days ago",
      unread: 0,
      avatar: "/placeholder.svg?height=40&width=40",
      online: true,
    },
  ]

  // Mock data for messages in the selected chat
  const messages = [
    {
      id: 1,
      sender: "tenant",
      text: "Hi, I wanted to report a leaking faucet in the bathroom.",
      time: "10:15 AM",
      read: true,
    },
    {
      id: 2,
      sender: "landlord",
      text: "Thanks for letting me know. I'll schedule a plumber to come take a look.",
      time: "10:20 AM",
      read: true,
    },
    {
      id: 3,
      sender: "landlord",
      text: "The plumber can come tomorrow between 2-4 PM. Does that work for you?",
      time: "10:22 AM",
      read: true,
    },
    {
      id: 4,
      sender: "tenant",
      text: "Yes, that works for me. I'll be home during that time.",
      time: "10:25 AM",
      read: true,
    },
    {
      id: 5,
      sender: "tenant",
      text: "When will the plumber arrive?",
      time: "10:30 AM",
      read: false,
    },
  ]

  // Mock data for announcements
  const announcements = [
    {
      id: 1,
      title: "Building Maintenance Notice",
      date: "Jun 15, 2023",
      content: "The water will be shut off on Monday, June 20th from 10 AM to 2 PM for routine maintenance.",
      properties: ["123 Main St", "456 Park Ave"],
      sent: true,
    },
    {
      id: 2,
      title: "Rent Increase Notice",
      date: "Jun 10, 2023",
      content: "Please be advised that there will be a 3% rent increase effective August 1st, 2023.",
      properties: ["All Properties"],
      sent: true,
    },
    {
      id: 3,
      title: "Holiday Office Hours",
      date: "Draft",
      content: "Our office will be closed on July 4th for Independence Day.",
      properties: ["All Properties"],
      sent: false,
    },
  ]

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // In a real app, this would send the message to the backend
      console.log("Sending message:", messageText)
      setMessageText("")
    }
  }

  const selectedChatData = chats.find((chat) => chat.id === selectedChat)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communication Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all tenant communications in one place</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
            <MessageSquare className="h-4 w-4 mr-1" />
            New Message
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messages" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">Direct Messages</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Chat List */}
            <Card className="md:col-span-1 overflow-hidden">
              <CardHeader className="p-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search conversations..." className="pl-8" />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-auto h-[calc(600px-65px)]">
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`flex items-start p-3 cursor-pointer hover:bg-slate-50 ${
                        selectedChat === chat.id ? "bg-slate-50" : ""
                      }`}
                      onClick={() => setSelectedChat(chat.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={chat.avatar} alt={chat.name} />
                          <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {chat.online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                        )}
                      </div>
                      <div className="ml-3 flex-1 overflow-hidden">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                          <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{chat.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{chat.property}</p>
                        <p className="text-xs truncate">{chat.lastMessage}</p>
                      </div>
                      {chat.unread > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
                        >
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="md:col-span-2 flex flex-col overflow-hidden">
              {selectedChatData ? (
                <>
                  <CardHeader className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={selectedChatData.avatar} alt={selectedChatData.name} />
                          <AvatarFallback>{selectedChatData.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{selectedChatData.name}</h3>
                          <p className="text-xs text-slate-500">{selectedChatData.property}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "landlord" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === "landlord" ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <div
                            className={`text-xs mt-1 flex justify-end ${
                              message.sender === "landlord" ? "text-teal-100" : "text-slate-500"
                            }`}
                          >
                            {message.time}
                            {message.sender === "landlord" && <span className="ml-1">{message.read ? "✓✓" : "✓"}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>

                  <div className="p-4 border-t">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Type a message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={handleSendMessage}
                        disabled={!messageText.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
                  <h3 className="text-lg font-medium text-slate-700">No conversation selected</h3>
                  <p className="text-sm text-slate-500 mt-1">Select a conversation from the list to start messaging</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Announcements</CardTitle>
                  <CardDescription>Send messages to multiple tenants</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Announcement
                  </Button>

                  <div className="mt-4 space-y-2">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm">{announcement.title}</h3>
                          {!announcement.sent && (
                            <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {announcement.sent ? announcement.date : "Not sent yet"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">To: {announcement.properties.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Announcement</CardTitle>
                  <CardDescription>Send a message to multiple properties or tenants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input placeholder="Enter announcement title" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipients</label>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        All Properties
                      </Button>
                      <Button variant="outline" size="sm">
                        Select Properties
                      </Button>
                      <Button variant="outline" size="sm">
                        Select Tenants
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea placeholder="Type your announcement message here..." className="min-h-[150px]" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Options</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="email" className="rounded" defaultChecked />
                        <label htmlFor="email" className="text-sm">
                          Email
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sms" className="rounded" />
                        <label htmlFor="sms" className="text-sm">
                          SMS
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="app" className="rounded" defaultChecked />
                        <label htmlFor="app" className="text-sm">
                          In-App
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-2">
                    <Button variant="outline">Save as Draft</Button>
                    <Button className="bg-teal-600 hover:bg-teal-700">Send Announcement</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Announcement Templates</CardTitle>
                  <CardDescription>Save time with pre-written announcements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                      <h3 className="font-medium text-sm">Maintenance Notice</h3>
                      <p className="text-xs text-slate-500 mt-1">Template for scheduled maintenance notifications</p>
                    </div>
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                      <h3 className="font-medium text-sm">Rent Reminder</h3>
                      <p className="text-xs text-slate-500 mt-1">Template for monthly rent payment reminders</p>
                    </div>
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                      <h3 className="font-medium text-sm">Inspection Notice</h3>
                      <p className="text-xs text-slate-500 mt-1">Template for property inspection notifications</p>
                    </div>
                    <div className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                      <h3 className="font-medium text-sm">Community Event</h3>
                      <p className="text-xs text-slate-500 mt-1">Template for community events and gatherings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

