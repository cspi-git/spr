(async()=>{
    "use strict";

    require("dotenv").config()

    // Dependencies
    const { MongoClient } = require("mongodb")
    const express = require("express")
    const helmet = require("helmet")
    const path = require("path")
    const fs = require("fs")

    // Variables
    const web = express()
    const port = process.env.PORT || 8080

    const explore = require("./database/explore.json")
    const client = new MongoClient(process.env.MONGODB_URL)

    const database = client.db("nightfall")
    const maliciousDomains = database.collection("maliciousDomains")
    const malwareHash = database.collection("malwaresHash")
    const maliciousYoutubeChannels = database.collection("maliciousYoutubeChannels")
    const maliciousDiscordServers = database.collection("maliciousDiscordServers")

    var SPR = {
        database: {
            maliciousDomains: 0,
            malwareHash: 0,
            maliciousYoutubeChannels: 0,
            maliciousDiscordServers: 0
        }
    }

    // Functions
    function publicFiles(file){
        return file ? path.join(__dirname, "public", file) : path.join(__dirname, "public")
    }

    async function reloadDatabase(){
        SPR.database.maliciousDomains = await maliciousDomains.count()
        SPR.database.malwareHash = await malwareHash.count()
        SPR.database.maliciousYoutubeChannels = await maliciousYoutubeChannels.count()
        SPR.database.maliciousDiscordServers = await maliciousDiscordServers.count()
    }

    /// Configurations
    // Express
    web.use(helmet({ contentSecurityPolicy: false }))
    web.set("view engine", "ejs")

    // Main
    await client.connect()

    web.use("", function(req, res, next){
        if(req.path.indexOf(".html") !== -1) return res.redirect("/404")

        next()
    })

    web.use(express.static(publicFiles()))

    web.get("/", function(req, res){
        res.sendFile(publicFiles("index.html"))
    })

    web.get("/status", function(req, res){
        const SPRDatabase = SPR.database

        res.render("status", {
            maliciousDomains: SPRDatabase.maliciousDomains,
            malwareHash: SPRDatabase.malwareHash,
            maliciousYoutubeChannels: SPRDatabase.maliciousYoutubeChannels,
            maliciousDiscordServers: SPRDatabase.maliciousDiscordServers
        })
    })

    web.get("/explore", function(req, res){
        res.render("explore", {
            data: explore
        })
    })

    web.get("/explore/:id", function(req, res){
        const id = req.params.id

        if(id){
            fs.existsSync(publicFiles(`explore/${id}.md`)) ? res.render("explore-view", { id: id }) : res.redirect("/explore")
        }else{
            res.redirect("/404")
        }
    })

    web.get("/404", function(req, res){
        res.sendFile(publicFiles("404.html"))
    })

    web.use("*", function(req, res){
        res.redirect("/404")
    })

    web.listen(port, ()=>{
        reloadDatabase()
        console.log(`The server is running. Port: ${port}`)

        setInterval(function(){
            reloadDatabase()
        }, 30 * 60 * 1000)
    })
})()