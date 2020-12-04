const express=require('express');
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const skt=require('socket.io');
const app=express();
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static("public"));
const server=app.listen(process.env.PORT || 3000, function(){
  console.log("Server up at port 3000");
});
const io=skt(server);

//--------------------------------------------------------Opening Connection to MongoDB Atlas
mongoose.connect("mongodb+srv://Aman290669:Aman290669@cluster0.qezsv.mongodb.net/InstaChat",{useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false });
const database=mongoose.connection;
const pageSchema={
  pageName:String,
  pagePassword:String,
  users:[{
    userName:String,
    socketId:String,
  }],
  messages:[{
    socketId:String,
    sender:String,
    message:String
  }]
}
const userSchema={
  socketId:String,
  userName:String,
  pageName:String,
}
const User=mongoose.model("User",userSchema);
const Page=mongoose.model("Page",pageSchema);

// newpage.save();
//--------------------------------------------------------Home Page
app.get("/",function(req,res){
  // //Database connection: on error
  // database.on("error",function(){
  //   res.render("error",{error:"500 Internal Server error. Please try again later"});
  // });
  // //Database connection: on successful
  // database.once("open",function(){
  //   res.render("index");
  // });
  res.render("index");
});

//--------------------------------------------------------HomePage/Anonymous page
app.route("/:requestedPage").get(function(req,res){
  const username=req.query.username;
  const password=req.query.password;
  const requestedPage=req.params.requestedPage;
  //Looking Database if page already Exists
  Page.findOne({pageName:requestedPage},function(err,result){
    if(err){
      res.render("error",{error:"500 Internal Server error. Please try again later"});
      console.log("Error found while looking for requestedPage: "+requestedPage);
    }else{
      //Page doesnt exists
      if(!result){
        //Sending user to setup new Chat Page
        res.render("passwordSetup");
      }
      //Page exists
      else{
        //Password not provided means redirect user to login page
          if(password===undefined){
            res.render("join",{destination:"/"+requestedPage+"?exists=true",comment:"Enter your password"});
          }
        //password provided,
          else{
            // password match if true, redirect to chat
            if(result.pagePassword===String(password)){
              Page.findOne({pageName:requestedPage},function(err,response){
                if(!err) res.render("chat",{pageName:requestedPage,username:username});
                console.log("The response is:"+response);
              })

            }
            // Password match if false, redirect back to login
            else res.render("join",{destination:"/"+requestedPage+"?exists=true",comment:"*Password Incorrect"});
          }
      }
    }
  })
//---------------------------------------------------------Post Login/Create password
}).post(async function(req,res){
  const username=req.body.username;
  const password=req.body.password;
  const exists=req.query.exists; // if this is undefined means posted from "Create" page, if true means posted from "login" page
  const address=req.params.requestedPage;
  if(exists===undefined){
    const newPage=new Page({
      pageName:address,
      pagePassword:password,
    })
    await newPage.save();
  }
  res.redirect("/"+address+"?username="+username+"&password="+password+"&exists="+(exists===undefined? false:exists));
});


io.on("connection",function(socket){
  //----------------------------------------------------------new user
  socket.on("user-connect",async function(pageName,username){
    socket.join(pageName);
    socket.pageName=pageName;
    socket.userName=username;
    console.log("pageName:" +pageName)
    const newUser=new User({
      socketId:socket.id,
      userName:username,
      pageName:pageName,
    })
    await newUser.save();
    await Page.findOne({pageName:pageName},function(err,result){
      if(err) console.log("Error in connection");
      else{
        console.log("Should be updated: "+username+" "+socket.id);
        result.users.push({userName:username,socketId:socket.id});
        result.save();
      }
    });
    console.log("broadcasted");
    socket.broadcast.to(pageName).emit("new-user",username,"has joined the chat");
  });
  //----------------------------------------------------------------------new message
  socket.on("message",function(pageName,userName,msg){
    socket.broadcast.to(pageName).emit("new-message",userName,msg);
    Page.findOne({pageName:pageName},async function(err,result){
      result.messages.push({socketId:socket.id,sender:userName,message:msg});
      await result.save();
    })
  })


 //-------------------------------------------------------------------------disconnect
  socket.on("disconnect",async function(){
    await User.findOneAndRemove({socketId:socket.id},function(err,result){
      if(!err) socket.broadcast.to(socket.pageName).emit("user-left",socket.userName," left the chat");
    })
    await Page.findOneAndUpdate({pageName:socket.pageName},{$pull:{users:{socketId:socket.id}}},function(err, result){
      if(err) console.log("error while removing");
      else console.log("removed user: "+socket.userName+" from page: "+socket.pageName);
    })
    await Page.findOne({pageName:socket.pageName},function(err,result){
      if(!err){
        if(!result){
        console.log("The length is:"+result.users.length);
        if(result.users.length===0){
          console.log("inside if");
          Page.findOneAndRemove({pageName:socket.pageName},function(err,res){
            console.log("removed for being zero: "+res)
          })
        }
      }
      }
    })
  })
})
