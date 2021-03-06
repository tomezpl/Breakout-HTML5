// Breakout
// Created by Tomasz Zajac

// Canvas objects
var g_CnvsCntnr; // Canvas container
var g_Cnvs; // Canvas
var g_Ctx; // Canvas context

// Canvas properties
var g_CW; // Width
var g_CH; // Height
var g_COW; // Original width (COW! Moo!)
var g_COH; // Original height
var g_COBG; // Original background (gradient)

// Refresh rate
var g_FPS = 60; // Frames per second (if only AAA developers managed to hit that target - Just Cause 3, I'm looking at you)
var g_FT = Math.round(1000 / g_FPS); // Frame time (ms)

// Game state
var g_Lost = false;
var g_Playing = true;
var g_Paused = false;

// Game stats
var g_Score = 0; // current score
var g_Time = 0; // current time (in seconds) - this can be later formatted into MM:SS format using getFormattedTime()
var g_Stage = 0; // current stage number
var g_StageCleared = false; // has the player finished the current stage
var g_OldScore = g_Score; // score at the end of the previous stage (or 0 if it's stage 1)

// The timer is started when createBlocks() is called but is only supposed to be started once,
// so this will be stay true once a timer is set and the timer will not be started again anymore
// (otherwise the game will be adding 2, 3, 4, etc. seconds to the time instead of 1)
var g_TimerSet = false;

// If set to true, ball doesn't move and doesn't collide so we can check the game for any errors
var g_DebugMode = false;

// If set to true, the game is scaled to fit the entire window
// So... full-window instead of fullscreen?
// BEWARE - causes lag on college computers
// Toggled using the F key.
var g_Fullscreen = false;

// If set to true, the game uses a high-contrast colour scheme
// designed for users with visual impairments.
var g_HCEnabled = false;

// Game classes
class Rect {
    constructor(X, Y, Width, Height)
    {
        this.x = X;
        this.y = Y;
        this.width = Width;
        this.height = Height;
    }
    
    static Hit(rect1, rect2)
    {
        var ret = false;

        if((rect1.x <= rect2.x + rect2.width && rect1.x + rect1.width >= rect2.x) || (rect2.x <= rect1.x + rect1.width && rect2.x + rect2.width >= rect1.x))
        {
            if((rect1.y <= rect2.y + rect2.height && rect1.y + rect1.height >= rect2.y) || (rect2.y <= rect1.y + rect1.height && rect2.y + rect2.height >= rect1.y))
            {
                ret = true;
            }
        }
        
        return ret;
    }
}

class SolidRect extends Rect {
    constructor(X, Y, Width, Height, FillColour)
    {
        super(X, Y, Width, Height);
        this.fillColour = FillColour;
    }
}

class MovingRect extends Rect {
    constructor(X, Y, Width, Height)
    {
        super(X, Y, Width, Height);
        this.oldX = X;
        this.oldY = Y;
    }
    
    UpdateOldPos()
    {
        this.oldX = parseFloat(this.x);
        this.oldY = parseFloat(this.y);
    }
    
    DirectionX()
    {
        return Math.round((parseFloat(this.x) - parseFloat(this.oldX)) / Math.abs(parseFloat(this.x) - parseFloat(this.oldX)));
    }
    
    DirectionY()
    {
        return Math.round((parseFloat(this.y) - parseFloat(this.oldY)) / Math.abs(parseFloat(this.y) - parseFloat(this.oldY)));
    }
}

class MovingSolidRect extends MovingRect {
    constructor(X, Y, Width, Height, FillColour)
    {
        super(X, Y, Width, Height);
        this.fillColour = FillColour;
    }
}

class Ball extends MovingSolidRect
{
    constructor(X, Y, Radius, FillColour, DirectionX, DirectionY, Speed)
    {
        super(X, Y, Radius, Radius, FillColour);
        this.dirX = parseInt(DirectionX);
        this.dirY = DirectionY;
        this.speed = Speed;
    }
    
    Move()
    {
        //console.log("Current ball pos {X: " + this.x + ", Y: " + this.y + "}");
        
        var newX = Math.min(1 - parseFloat(this.width), Math.max(0, parseFloat(this.x) + (parseFloat(this.dirX) * parseFloat(this.speed))));
        if(isNaN(newX))
            newX = this.x;

        //console.log(this.y + (this.dirY * this.speed));
        var newY = Math.min(1 - parseFloat(this.height), Math.max(0, parseFloat(this.y) + (parseFloat(this.dirY) * parseFloat(this.speed))));
        if(isNaN(newY))
        {
            newY = this.y;
            console.log("NaN");
        }
        
        //console.log("New ball pos {X: " + newX + ", Y: " + newY + "}");
        
        this.x = newX;
        this.y = newY;
    }
    
    CheckCollision(paddle)
    {
        var invertX = false;
        var invertY = false;
        var hitPaddle = false;

        if(Rect.Hit(this, paddle))
        {
            hitPaddle = true;
            //this.dirX = Math.max(-1, Math.min(1, this.DirectionX() + paddle.DirectionX())); // this doesn't work - tried to alter the ball's direction using the direction the paddle is moving
        }

        for(var i = 0; i < g_BlockList.length; i++)
        {
            if(g_BlockList[i].isActive)
            {
                if(Rect.Hit(this, g_BlockList[i]))
                {
                    invertY = true;
                    g_Score++;
                    g_BlockList[i].isActive = false;
                    if(g_Score - g_OldScore >= g_BlockList.length - 1)
                        g_StageCleared = true;
                    break;
                }
                else
                {
                    continue;
                }
            }
            else
            {
                continue;
            }
        }

        if(this.x <= 0 || this.x + this.width >= 1)
            invertX = true;
        if(this.y <= 0 || this.y + this.height >= 1)
            invertY = true;
        
        if(this.y + this.height >= 1 && !g_StageCleared)
        {
            g_Lost = true;
            g_Playing = false;
        }
        
        if(invertY)
            this.dirY *= -1;
        if(invertX)
            this.dirX *= -1;
        if(hitPaddle)
            this.dirY = -1;
    }
}

class Block extends SolidRect
{
    constructor(X, Y, Width, Height, FillColour, IsActive)
    {
        super(X, Y, Width, Height, FillColour);
        this.isActive = IsActive;
    }
}

var g_Paddle = new MovingSolidRect(0.4, 0.875 + (0.125 / 2.5), 0.2, 0.125 / 5, "white");
var g_Ball = new Ball(0.4875, g_Paddle.x - (0.0125 * 1.25), (0.0125 * 1.25), "silver", -1, 1, 0.0075);
var g_BlockList = [new Block(0, 0, 0, 0, "", false)]; // Initialise array with a dummy block

function initCanvas(canvasNameStr)
{
    // For some reason I decided to put the canvas inside another <div> so let's leave it like that
    g_CnvsCntnr = document.getElementById(canvasNameStr + "Container");
    g_Cnvs = document.getElementById(canvasNameStr);
    g_Ctx = g_Cnvs.getContext("2d");
    
    g_COW = g_Cnvs.width;
    g_COH = g_Cnvs.height;
    
    g_COBG = window.getComputedStyle(g_Cnvs).background;
    
    // Set initial size of the canvas to fit the window
    resizeCanvas();

    // Initialise blocks
    createBlocks();
    
    // Left for web server scripting:
    /*
    if(window.localStorage.getItem("hcEnabled") == 1)
        g_HCEnabled = true;
    switchHCMode();
    */

    //g_StartTime = getCurrentSeconds();
    //g_CurrentTime = g_StartTime;

    setInterval(render, g_FT);
}

function resizeCanvas()
{
    if(g_Fullscreen)
    {
        // Fit the canvas to the window
        g_CnvsCntnr.style.width = document.body.clientWidth + "px";
        g_CnvsCntnr.style.height = (window.innerHeight - 5) + "px"; // Subtract a small value to avoid scrolling
        g_Cnvs.width = document.body.clientWidth;
        g_Cnvs.height = window.innerHeight - 5; // Subtract a small value to avoid scrolling
    }
    else
    {
        g_CnvsCntnr.style.width = g_COW + "px";
        g_CnvsCntnr.style.height = g_COH + "px";
        g_Cnvs.width = g_COW;
        g_Cnvs.height = g_COH;
    }

    g_CW = g_Cnvs.width; // Get and store the width from the element
    g_CH = g_Cnvs.height; // Get and store the height from the element
}

// get the absolute X coordinate from a "normalised" X value (between 0 and 1)
function getX(xCoord)
{
    return Math.round(xCoord * g_CW);
}

// get the absolute Y coordinate from a "normalised" Y value (between 0 and 1)
function getY(yCoord)
{
    return Math.round(yCoord * g_CH);
}

// get a "normalised" X value from an absolute X coordinate
function getRelX(xCoord)
{
    return parseFloat(xCoord) / parseFloat(g_CW);
}

// get a "normalised" Y value from an absolute Y coordinate
function getRelY(yCoord)
{
    return parseFloat(yCoord) / parseFloat(g_CH);
}

function render()
{
    // Reset the shadow properties
    g_Ctx.shadowColor = "";
    g_Ctx.shadowOffsetX = 0;
    g_Ctx.shadowOffsetY = 0;
    g_Ctx.shadowBlur = 0;

    // Reset transparency
    g_Ctx.globalAlpha = 1.0;

    // Clear the canvas and fill it with the background
    g_Ctx.clearRect(0, 0, g_CW, g_CH);
    //g_Ctx.fillStyle = g_CBG;
    //g_Ctx.fillRect(0, 0, g_CW, g_CH);
    
    
    
    g_Ctx.globalAlpha = 1.0;
    
    // Check game state
    if(g_Playing)
    {
        // Render paddle
        g_Ctx.fillStyle = g_Paddle.fillColour;

        // Create a "trail" effect on the paddle based on its direction
        g_Ctx.shadowColor = "rgba(0, 0, 0, 64)";
        g_Ctx.shadowOffsetX = g_Paddle.DirectionX() * -3;
        g_Ctx.shadowOffsetY = 1;
        g_Ctx.shadowBlur = 5;

        g_Ctx.fillRect(getX(g_Paddle.x), getY(g_Paddle.y), getX(g_Paddle.width), getY(g_Paddle.height));

        // Render ball
        g_Ctx.fillStyle = g_Ball.fillColour;

        // Create a "trail" effect on the ball based on its direction
        if(!isNaN(g_Ball.DirectionX()))
            g_Ctx.shadowOffsetX = parseInt(g_Ball.DirectionX()) * -2;
        else
            g_Ctx.shadowOffsetX = 0;
        if(!isNaN(g_Ball.DirectionY()))
            g_Ctx.shadowOffsetY = parseInt(g_Ball.DirectionY()) * -2;
        else
            g_Ctx.shadowOffsetY = 0;

        g_Ctx.beginPath();
        g_Ctx.arc(getX(g_Ball.x + (g_Ball.width / 2)), getY(g_Ball.y + (g_Ball.height / 2)), getX(g_Ball.width), 0, Math.PI * 2);
        //console.log("Current ball pos {X: " + g_Ball.x + ", Y: " + g_Ball.y + "}");
        g_Ctx.fill();

        // Render blocks
        for(var i = 0; i < g_BlockList.length; i++)
        {
            if(g_BlockList[i].isActive)
            {
                g_Ctx.fillStyle = g_BlockList[i].fillColour;

                g_Ctx.shadowColor = "rgba(0, 0, 0, 32)";
                g_Ctx.shadowOffsetX = 0;
                g_Ctx.shadowOffsetY = 0;
                g_Ctx.shadowBlur = 5;

                g_Ctx.fillRect(getX(g_BlockList[i].x), getY(g_BlockList[i].y), getX(g_BlockList[i].width), getY(g_BlockList[i].height));
            }
            else
            {
                continue;
            }
        }

        // Update the paddle's and the ball's directions
        g_Paddle.UpdateOldPos();
        g_Ball.UpdateOldPos();

        // Move the paddle and perform basic collision detection
        if(!g_DebugMode) // not if in debug mode though
        {
            if(!g_Paused)
            {
                g_Ball.Move();
                g_Ball.CheckCollision(g_Paddle);
            }
        }

        // Render HUD
        g_Ctx.fillStyle = "black";
        g_Ctx.globalAlpha = 0.25;

        g_Ctx.shadowOffsetX = 0;
        g_Ctx.shadowOffsetY = 0;
        g_Ctx.shadowColor = "";
        g_Ctx.shadowBlur = 0;
        
        g_Ctx.fillRect(0, 0, getX(1), getY(0.0875));
        g_Ctx.fillRect(0, 0, getX(0.25), getY(0.0875));
        g_Ctx.fillRect(getX(0.75), 0, getX(0.25), getY(0.0875));

        g_Ctx.shadowColor = "rgba(0, 0, 0, 64)";
        g_Ctx.shadowOffsetX = 0;
        g_Ctx.shadowOffsetY = 0;
        g_Ctx.shadowBlur = 5;

        g_Ctx.globalAlpha = 1.0;
        g_Ctx.fillStyle = "white";
        g_Ctx.font = "32px sans-serif";
        g_Ctx.textAlign = "center";
        g_Ctx.fillText("Score: " + g_Score, getX(0.25 / 2.0), getY(0.0875 / 1.5));
        g_Ctx.fillText("Time: " + getFormattedTime(g_Time), getX((0.25 / 2.0) * 4), getY(0.0875 / 1.5));
        g_Ctx.fillText("Stage: " + g_Stage, getX((0.25 / 2.0) * 7), getY(0.0875 / 1.5));
        
        // Semi-transparent black background to make text stand out
        if(g_StageCleared || g_Paused)
        {
            g_Ctx.fillStyle = "black";
            g_Ctx.globalAlpha = 0.75;

            g_Ctx.shadowOffsetX = 0;
            g_Ctx.shadowOffsetY = 0;
            g_Ctx.shadowColor = "";
            g_Ctx.shadowBlur = 0;

            g_Ctx.fillRect(0, 0, getX(1), getY(1));
        }

        g_Ctx.globalAlpha = 1.0;
        g_Ctx.shadowColor = "rgba(0, 0, 0, 64)";
        g_Ctx.shadowOffsetX = 0;
        g_Ctx.shadowOffsetY = 0;
        g_Ctx.shadowBlur = 5;

        if(g_StageCleared)
        {
            g_Ctx.fillStyle = "white";
            g_Ctx.font = "48px sans-serif";
            g_Ctx.textAlign = "center";
            g_Ctx.fillText("You beat stage " + g_Stage + "!", getX(0.5), getY(0.375));
            g_Ctx.font = "20px sans-serif";
            g_Ctx.fillText("Press ENTER if you would like to proceed to stage " + (g_Stage + 1) + ".", getX(0.5), getY(0.375 * 1.2));
        }
        
        if(g_Paused)
        {
            g_Ctx.fillStyle = "white";
            g_Ctx.font = "48px sans-serif";
            g_Ctx.textAlign = "center";
            g_Ctx.fillText("GAME PAUSED", getX(0.5), getY(0.375));
            g_Ctx.font = "20px sans-serif";
            g_Ctx.fillText("Press the ESC key if you want to resume playing.", getX(0.5), getY(0.375 * 1.2));
        }
    }
    else
    {
        if(g_Lost)
        {
            // Semi-transparent black background to make text stand out
            g_Ctx.fillStyle = "black";
            g_Ctx.globalAlpha = 0.75;

            g_Ctx.shadowOffsetX = 0;
            g_Ctx.shadowOffsetY = 0;
            g_Ctx.shadowColor = "";
            g_Ctx.shadowBlur = 0;

            g_Ctx.fillRect(0, 0, getX(1), getY(1));
            
            g_Ctx.globalAlpha = 1.0;

            g_Ctx.shadowColor = "rgba(0, 0, 0, 64)";
            g_Ctx.shadowOffsetX = 0;
            g_Ctx.shadowOffsetY = 0;
            g_Ctx.shadowBlur = 5;

            g_Ctx.fillStyle = "white";
            g_Ctx.font = "48px sans-serif";
            g_Ctx.textAlign = "center";
            g_Ctx.fillText("You lost!", getX(0.5), getY(0.375));
            g_Ctx.font = "20px sans-serif";
            
            var stageStr = "stage";
            if(g_Stage - 1 > 1 || g_Stage - 1 == 0)
                stageStr += "s";
            
            g_Ctx.fillText("Your score was " + g_Score + ", you finished " + (g_Stage - 1) + " " + stageStr + " and your time was " + getFormattedTime(g_Time) + ". Press ENTER to try again.", getX(0.5), getY(0.375 * 1.2));
        }
    }
}

function movePaddle(mouseX)
{
    if(!g_Paused)
    // the center of the paddle will be where the mouse cursor is
    // also prevent going from offscreen (keep X between 0 and 1)
    g_Paddle.x = Math.max(0.0, Math.min(1 - g_Paddle.width, getRelX(parseFloat(mouseX)) - (g_Paddle.width / 2.0)));
}

// Key press handlers
// ENTER key
function enterKeyPress()
{
    if(g_Playing)
    {
        // TODO
    }
    else
    {
        if(g_Lost)
        {
            restartGame();
        }
    }
    
    if(g_StageCleared)
    {
        g_OldScore = g_Score;
        reinitObjects();
    }
}

// ESC key
function escKeyPress()
{
    if(g_Playing && !g_Lost && !g_StageCleared)
        g_Paused = !g_Paused;
}

// F key
function fKeyPress()
{
    g_Fullscreen = !g_Fullscreen;
    resizeCanvas();
}

// H key
function hKeyPress()
{
    g_HCEnabled = !g_HCEnabled;
    
    if(g_HCEnabled)
        window.localStorage.setItem("hcEnabled", 1);
    else
        window.localStorage.setItem("hcEnabled", 0);
    
    switchHCMode();
}

// Control game state
function reinitObjects()
{
    // Initialise the paddle and the ball again
    g_Paddle = new MovingSolidRect(0.4, 0.875 + (0.125 / 2.5), 0.2, 0.125 / 5, "white");
    g_Ball = new Ball(0.4875, g_Paddle.x - (0.0125 * 1.25), (0.0125 * 1.25), "silver", -1, 1, 0.0075);

    // Reinitialise the blocks
    g_BlockList = [new Block(0, 0, 0, 0, "", false)]; // Initialise array with a dummy block
    createBlocks();
    
    switchHCMode();
}

function switchHCMode()
{
    if(g_HCEnabled)
    {
        g_Cnvs.style.background = "black";
        g_Ball.fillColour = "#ff7a7a";
    }
    else
    {
        g_Cnvs.style.background = g_COBG;
        g_Ball.fillColour = "silver";
    }
}

function blockPyramid()
{
    var startX = 0.5;
    var startY = 0.125;

    var width = 0.05;
    var height = 0.015;

    var paddingX = 0.001;
    var paddingY = 0.005;
    
    var colMax = 20;
    var rowMax = 20;
    var cols = Math.min(Math.round(Math.random() * colMax), colMax);
    var rows = Math.min(Math.round(Math.random() * rowMax), rowMax);
    
    var xLimit = 1;

    startX -= (width / 2);

    for(var y = 0; y < rows; y++)
    {
        var x = 0;
        while(x < xLimit)
        {
            if(startX + (width * x) + (paddingX * x) + width > 1 || startX + (width * x) + (paddingX * x) < 0)
                break;
            g_BlockList.push(new Block(startX + (width * x) + (paddingX * x), startY + (height * y) + (paddingY * y), width, height, "yellow", true));
            x++;
        }
        xLimit = Math.min(xLimit+1, cols);
        if(x < xLimit)
            startX -= (width / 2);
    }
}

function blockWall()
{
    var width = 0.05;
    var height = 0.015;
    
    var colMax = 20;
    var rowMax = 20;
    var cols = Math.min(Math.round(Math.random() * colMax), colMax);
    var rows = Math.min(Math.round(Math.random() * rowMax), rowMax);
    
    var startX = 0.5 - ((width / 2) * cols);
    var startY = 0.125;

    var paddingX = 0.001;
    var paddingY = 0.005;
    
    for(var y = 0; y < rows; y++)
    {
        for(var x = 0; x < cols; x++)
        {
            if(startX + (width * x) + (paddingX * x) + width > 1 || startX + (width * x) + (paddingX * x) < 0)
                break;
            g_BlockList.push(new Block(startX + (width * x) + (paddingX * x), startY + (height * y) + (paddingY * y), width, height, "yellow", true));
        }
    }
}

function blockLine()
{
    var width = 0.05;
    var height = 0.015;
    
    var colMax = 20;
    var cols = Math.min(Math.round(Math.random() * colMax), colMax);
    var rows = 1;
    
    var startX = 0.5 - ((width / 2) * cols);
    var startY = 0.125;

    var paddingX = 0.001;
    var paddingY = 0.005;
    
    for(var y = 0; y < rows; y++)
    {
        for(var x = 0; x < cols; x++)
        {
            if(startX + (width * x) + (paddingX * x) + width > 1 || startX + (width * x) + (paddingX * x) < 0)
                break;
            g_BlockList.push(new Block(startX + (width * x) + (paddingX * x), startY + (height * y) + (paddingY * y), width, height, "yellow", true));
        }
    }
}

function createBlocks()
{
    var startX = 0.01;
    var startY = 0.375

    var width = 0.05;
    var height = 0.015;

    var paddingX = 0.001;

    var blockStyle = Math.min(Math.max(Math.round(Math.random() * 2), 0), 2);
    
    switch(blockStyle)
    {
        case 0:
            blockLine();
            break;
        case 1:
            blockWall();
            break;
        case 2:
            blockPyramid();
            break;
    }

    // Move the ball under the lowest brick
    var lowestBlockY = 0;
    for(var i = 0; i < g_BlockList.length; i++)
    {
        if(lowestBlockY < g_BlockList[i].y)
            lowestBlockY = g_BlockList[i].y;
    }
    g_Ball.y = Math.max(g_Ball.y, lowestBlockY + g_Ball.height);
    
    // Set a timer if there isn't one
    if(!g_TimerSet)
    {
        g_TimeInterval = setInterval(function(){if(g_Playing && !g_StageCleared && !g_Lost && !g_Paused)g_Time++;}, 1000);
        g_TimerSet = true;
    }

    g_Stage++;
    g_StageCleared = false;
}

function restartGame()
{
    g_Stage = 0;
    g_StageCleared = false;

    // Reinitialise the game objects
    reinitObjects();

    // Set the state again
    g_Lost = false;
    g_Playing = true;
    g_Paused = false;
    g_Score = 0;
    g_OldScore = 0;
    g_Time = 0;
}

// Utility functions

// Returns a formatted string with the elapsed time
// (format MM:SS)
function getFormattedTime(time)
{
    var minutes = ((time - (time % 60)) / 60);
    var seconds = (time % 60);
    
    var addZeroToMinutes = false;
    var addZeroToSeconds = false;
    
    // if it's less than 10 minutes or seconds
    // then you need to add a 0 
    // in front of it
    if(minutes < 10)
        addZeroToMinutes = true;
    if(seconds < 10)
        addZeroToSeconds = true;
    
    var retStr = minutes + ":";
    if(addZeroToMinutes)
        retStr = "0" + retStr;
    if(addZeroToSeconds)
        retStr += "0"
    retStr += seconds;
    
    return retStr;
}

function getCurrentSeconds()
{
    return g_Date.getSeconds() + Math.max(0, (Math.max(0, ((g_Date.getHours() -1) * 60)) + g_Date.getMinutes() - 1) * 60);
}

// Assign events
document.addEventListener("load", initCanvas("canvas"));

g_Cnvs.addEventListener("mousemove", function(event)
{
    // subtract the X offset from the X coordinate of the mouse cursor
    // (e.g. if canvas is centered)
    movePaddle(event.clientX - parseInt(getComputedStyle(g_CnvsCntnr).marginLeft));
});

// For mobile devices, move the paddle on each tap
document.addEventListener("click", function(event)
{
    if(g_Playing)
        movePaddle(event.clientX - parseInt(getComputedStyle(g_CnvsCntnr).marginLeft));
});

window.onresize = resizeCanvas;

document.addEventListener("keydown", function(event)
{
    switch(event.keyCode)
    {
        // ENTER key
        case 13:
            enterKeyPress();
            break;
        case 27:
            escKeyPress();
            break;
        case 70:
            fKeyPress();
            break;
        case 72:
            hKeyPress();
            break;
    }
});