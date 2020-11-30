const express=require('express');
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const app=express();
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

//--------------------------------------------------------Opening Connection to MongoDB Atlas
mongoose.connect("mongodb+srv://Aman290669:Aman290669@cluster0.qezsv.mongodb.net/InstaChat",{useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false });
const database=mongoose.connection;
const pageSchema={
  pageName:String,
  pagePassword:String,
}
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
            if(result.pagePassword===String(password)) res.render("chat");
            // Password match if false, redirect back to login
            else res.render("join",{destination:"/"+requestedPage+"?exists=true",comment:"*Password Incorrect"});
          }
      }
    }
  })
//---------------------------------------------------------Post Login/Create password
}).post(async function(req,res){
  const password=req.body.password;
  const exists=req.query.exists; // if this is undefined means posted from "Create" page, if true means posted from "login" page
  const address=req.params.requestedPage;
  if(exists===undefined){
    const newPage=new Page({
      pageName:address,
      pagePassword:password
    })
    await newPage.save();
  }
  res.redirect("/"+address+"?"+"password="+password+"&exists="+(exists===undefined? false:exists));
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Server up at port 3000");
});
