sub runUserInterface()
    m.port = CreateObject("roMessagePort")
    screen = createScreen()

    while true
        msg = wait(0, m.port)
	    msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        else if msgType = invalid
            ?"Invalid event"
        end if
    end while
end sub

function createScreen() as object
    screen = createObject("roSGScreen")
    screen.setMessagePort(m.port)

    scene = screen.createScene("MainScene")
    scene.allowBackgroundTask = true
    screen.show()

    return screen
end function
