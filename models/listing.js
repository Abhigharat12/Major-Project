const mongoose=require("mongoose");
const Schema=mongoose.Schema;

const listingSchema =new Schema({
    title :{
        type :String,
        required :true,
    },
    description  : String,
    
    image :{
        type : String,
        default : "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.indiatvnews.com%2Fphotos%2Ffashion-lifestyle-5-most-beautiful-flower-valleys-in-india-you-should-visit-2025-02-23-977591&psig=AOvVaw3myLtBx5iKVGhj8IbKjbg5&ust=1749555391777000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCLCUkPCf5I0DFQAAAAAdAAAAABAE",
        set : (v) => v===""? "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.indiatvnews.com%2Fphotos%2Ffashion-lifestyle-5-most-beautiful-flower-valleys-in-india-you-should-visit-2025-02-23-977591&psig=AOvVaw3myLtBx5iKVGhj8IbKjbg5&ust=1749555391777000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCLCUkPCf5I0DFQAAAAAdAAAAABAE": v
         
    }, 
    price :Number,
    location : String,
    country : String,
});

const Listing =mongoose.model("Listing",listingSchema);
module.exports=Listing;