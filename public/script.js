const socket=io();
socket.emit("user-connect",pageName,username);

$("form").submit(function(event){
  event.preventDefault();
  socket.emit("message",pageName,username,$("#messageBox").val());
  addMessage("You",$("#messageBox").val());
  $("#messageBox").val('');
})

socket.on("user-left",function(name,msg){
  addMessage(name,msg);
})
socket.on("new-message",function(name,msg){
  addMessage(name,msg);
})
socket.on("new-user",function(name,msg){
  addMessage(name,msg);
})

function addMessage(name,msg){
  $("#messages").append("<li>"+name+": "+msg+"</li>")
}
