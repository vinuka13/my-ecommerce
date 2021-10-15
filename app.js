const express = require('express')
const mongoose = require('mongoose') 
const bodyParser = require("body-parser");
const validator = require('validator')
const bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken');
const cookies = require('cookie-parser')
const nodemailer = require('nodemailer');



const app = express()
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());
app.use(cookies())


mongoose.connect('mongodb://localhost:27017/playDB', {useNewUrlParser: true, useUnifiedTopology: true})

const playSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter product name'],
        trim: true,
        maxlength: [100, 'Product name cannaot exceed 100 charactors']
    },
    price : {
        type: Number,
        required: [true, 'Please enter product price'],
        maxlength: [5, 'Product peice cannot exceed 5 charactors'],
        default: 0.0
    },
    description: {
        type: String,
        required: [true, 'Please enter product description']
    },
    ratings : {
        type: Number,
        default: 0
    },
    images: [
        {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true
            },
        }
    ],
    category: {
        type: String,
        required: [true, 'Please enter the product category'],
        enum: {
            values: [
                'Electronics',
                'Cameras',
                'Laptops',
                'Accessories',
                'Headphones',
                'Food',
                "Books",
                'Clothes/Shoes',
                'Beauty/Health',
                'Sports',
                'Outdoor',
                'Home',
            ],
        message: 'Please select correct category for the product'
        }
    },
    seller: {
        type: String,
        required: [true, 'Please enter product seller']
    },
    stock: {
        type: Number,
        required: [true, 'Please enter product stock'],
        maxlength: [5, 'Product stock cannot exceed 5 charactors'],
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
     reviews: [
         {
             name: {
                 type: String,
                 required: true
             },
             rating: {
                 type: Number,
                 required: true
             },
             comment: {
                 type: String,
                 required: true
             }
         }
     ],
     user: {
        type:  mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
     },
     createdAt: {
         type: Date,
         default: Date.now
     }
})

const Product = mongoose.model('Product', playSchema)



 
  //get product by id
app.route("/product/:id")
       .get(function(req, res){
           Product.findOne({_id: req.params.id}, function(err, docs){
               if(docs){
                   res.send(docs)
               } else {
                   res.send({
                       success: false,
                       error: "Product not found"
                   })
               }
           })
       })
       
//filter products by keyword, category     

app.route("/products")
        .get( function(req, res){

                  Product.find({ $and: [
                        {
                            name: { 
                                $regex: req.query.keyword,
                                $options: 'i'
                             } 
                         }, {
                             category: { 
                                 $regex: req.query.category
                             }
                         }
                         
                     ]} , function(err, docs){
                         if(!err){
                             res.send({
                                 success: true,
                                 count: docs.length,
                                 docs
                             })
                         } else {
                             res.send(err.stack)
                         }
                     }
                     ).limit(4).skip(Number(4 * (req.query.page - 1)))

                
        })       

// create products

 app.route('/product/admin/new')       
   .post(async function(req, res){

    
       //getting the token
       const token = req.cookies.token
       if(!token){
        res.send({
            success: false,
            message: 'User not logged in'
        })
    } else {
       //decode token
       const decode = jwt.verify(token, 'shhhh')
       //find the user by decoded token
       const userDecode = await User.findById(decode.id)
       //finding the users role
       const userRole = userDecode.role
       //true if users role is admin, false if not
       const adminUser = userRole.includes('admin')

        if(adminUser){

            req.body.user = userDecode.id;
            const newProduct = new Product(req.body);

            newProduct.save(function(err){
              if(err){
                res.send(err)
              } else{
                res.send('Product successfully created')
              }
            });
        } else {
            res.send({
                success: false,
                message: 'You are not an admin'
            })
        }
        
    }

   })


//update and delete product

app.route("/product/admin/:id")
         .put(async function(req, res){

            const token = req.cookies.token
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const userRole = userDecode.role
            const adminUser = userRole.includes('admin')


            if(!token){
                res.send({
                    succes: false,
                    message: 'Unaouthorozed user'
                })
            } else {
                if(adminUser){
                    Product.findByIdAndUpdate(req.params.id, req.body, {
                        new: true,
                        runValidators: true
                    }, function(err, docs){
                        if(!err){
                            res.send({
                                success: true,
                                docs
                            })
                        } else {
                            res.send(err)
                        }
                    })
                } else {
                    res.send({
                        success: false,
                        message: 'You are not an admin'
                    })
                }
                
            } 
         })
         .delete(async function(req, res){

            const token = req.cookies.token
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const userRole = userDecode.role
            const adminUser = userRole.includes('admin')

            if(!token){
                res.send({
                    succes: false,
                    message: 'Unaouthorozed user'
                })
            } else {
                if(adminUser){
                    Product.findByIdAndDelete(req.params.id, function(err){
                        if(!err){
                            res.send({
                                success: true,
                                message: `Product deleted`
                            })
                        } else {
                            res.send(err)
                        }
                    })
                } else {
                    res.send({
                        success: false,
                        message: 'You are not an admin'
                    })
                }
                
            }
             
         })

//creating user model

const userSchema = new mongoose.Schema({
    name: {
        type:String,
        required: true,
        maxlength: [30, 'Your name cannot exceed 30 charcters']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [validator.isEmail, 'Please enter valid email']
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
        minlength: [6, 'Your password cannot be shoter than 6 charactors'],
        select: false
    },
    avatar: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    },
    role: {
        type: String,
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
})

//encrypt password before saving

userSchema.pre('save', async function (next){
    if(!this.isModified('password')){
        next()
    }

    this.password = await bcrypt.hash(this.password, 10)
})

//return json web token before saving

userSchema.methods.getJwtToken = function(){
    return jwt.sign({id: this._id}, 'shhhh', {
        expiresIn: '7d'
    })
}

//return password reset token 

userSchema.methods.getResetPasswordToken = function(){

    var otp = Math.floor(Math.random() * 1000000)

    this.resetPasswordToken = otp
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000

    return otp
    
}

const User = mongoose.model('User', userSchema)

//register user

app.route('/register/new')
     .post(function(req, res){
           const newUser = new User({
               name: req.body.name,
               email: req.body.email,
               password: req.body.password,
               avatar: {
                public_id: 'products/61oXGZ60GfL_fixco9',
                url: 'https://res.cloudinary.com/bookit/image/upload/v1614877995/products/61oXGZ60GfL_fixco9.jpg'
            }
           })


           const token = newUser.getJwtToken()

           newUser.save(function(err){
               if(err){
                   res.send(err.message)
               } else {
               res.cookie('token', token, {expires: new Date( Date.now() + 7 * 24 * 60 * 60 * 1000), httpOnly : true} ).json({
                   succes: true,
                   token,
                   newUser
               })
               }
           })
        

  })

//login user 

app.route('/login')
      .post(function(req, res){
         const email = req.body.email
         const password = req.body.password

          User.findOne({email: email}, function(err, docs){
              if(err){
                res.send(err.stack)
              } else {
                  if(docs){  
                      bcrypt.compare(password, docs.password, function(erorr, result){
                          if(result == true){
                            const token = docs.getJwtToken()
                              res.cookie('token', token, {expires: new Date( Date.now() + 7 * 24 * 60 * 60 * 1000), httpOnly : true}).json({
                                  succes: true,
                                  token,
                                  docs
                              })
                           } else{
                              res.send({
                                 succes: false,
                                 message: 'Invalid password'
                              })
                          }
                      })
                  } else {
                      res.send({
                          success: false,
                          message: 'Inavlaid username'
                      })
                  }
              }
          }).select("+password")  
      })

//forgot password


app.route('/password/forgot')
      .post(async function(req, res){
        
        var transport = nodemailer.createTransport({
            host: "smtp.mailtrap.io",
            port: 2525,
            auth: {
              user: "2347f510469fc7",
              pass: "7e5c9ac829c3a4"
            }
          });

        const email = req.body.email
        const user = await User.findOne({email: email})
        console.log(user)
        if(user){
            const token = user.getResetPasswordToken()

            await user.save({validateBeforeSave: false})

           var mailOptions = {
               to: email,
               subject: "Password reset token",
               text: 'Your password reset token is ' + token
           }

           transport.sendMail(mailOptions, function(err, info){
               if(err){
                   res.send({
                       succes: false,
                       error: err.stack
                   })
               } else {
                   res.send({
                       succes: true,
                       message: `Email send to ${user.email}`
                   })
               }
           })
        } else {
            res.send({
                succes: true,
                message: 'User in this email dosent exist'
            })
        }

      })

//reset password

app.route('/password/reset/:token')
    .put(async function(req, res){
        const user =await User.findOne({resetPasswordToken: req.params.token})
        if(user){
            if(user.resetPasswordExpire > Date.now()){
                if(req.body.password === req.body.conformPassword){
                    user.password = req.body.password
                    user.resetPasswordToken = undefined
                    user.resetPasswordExpire = undefined

                    const jwtToken = user.getJwtToken()

                    await user.save(function(err){
                        if(err){
                            res.send(err.stack)
                        } else {
                            res.cookie('token', jwtToken, {expires: new Date( Date.now() + 7 * 24 * 60 * 60 * 1000), httpOnly : true} ).json({
                                succes: true,
                                message: `Password change to ${req.body.password}`,
                                jwtToken,
                            })
                        }
                    })

                    
                } else {
                    res.send({
                        success: false,
                        message: 'Passwords dont match'
                    })
                }
            } else {
                res.send({
                    success: false,
                    message: 'Token expired'
                })
            }
        } else {
            res.send({
                success: false,
                message: 'Token invalid'
            })
        }
    })

//logout user

app.route('/logout')
      .get(function(req, res){
          res.cookie('token', null, {expires: new Date(Date.now()), httpOnly:true}).json({
              succes: true,
              message: 'user logged out'
          })
      })

//admin routes

//get all users

app.route('/admin/users')
      .get(async function(req, res){

        const token = req.cookies.token
        const decode = jwt.verify(token, 'shhhh')
        const user = await User.findById(decode.id)
        const adminUser = user.role.includes('admin')

     if(adminUser){
         const users = await User.find()

         res.send({
             successs: true,
             count: users.length,
             users
         })
     } else {
         res.send({
             success: false,
             message: "Unorthorized user"
         })
     }

      })

//get users by Id 

app.route('/admin/user/:id')
      .get(async function(req, res){

        const token = req.cookies.token
        const decode = jwt.verify(token, "shhhh")
        const user = await User.findById(decode.id)
        const adminUser = user.role.includes('admin')

        if(adminUser){
            const user = await User.findById(req.params.id)

            if(user){
                res.send({
                    success: true,
                    user
                })
            } else {
                res.send({
                    successs: false,
                    message: 'User not found'
                })
            }
        } else {
            res.send({
                success: false,
                message: "Unorthorized user"
            })
        }
      })

//update user
      .post(async function(req, res){

        const token = req.cookies.token
        const decode = jwt.verify(token, "shhhh")
        const user = await User.findById(decode.id)
        const adminUser = user.role.includes('admin')

        if(adminUser){
            const user = await User.findById(req.params.id)

            if(user){
                user.role = req.body.role
                user.save()

                res.send({
                    success: true,
                    user
                })
            }else {
                res.send({
                    success: false,
                    message: "user not found"
                })
            } 
        } else {
            res.send({
                success: false,
                message: 'Unorthorized user'
            })
        }
      })

//delete users
      .delete(async function(req, res){

        const token = req.cookies.token
        const decode = jwt.verify(token, "shhhh")
        const user = await User.findById(decode.id)
        const adminUser = user.role.includes('admin')

        if(adminUser){
            const user =await User.findById(req.params.id)

            if(user){
                user.remove()

                res.send({
                    success: true,
                    message: 'user deleted'
                })
            } else {
                res.send({
                    success: false,
                    message: 'User not found'
                })
            }
        } else {
            res.send({
                success: false,
                message: 'Unorthorized user'
            })
        }
      })



//creating orders model 

const orderSchema = new mongoose.Schema({
    shippingInfo:{
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        phoneNo: {
            type: Number,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
    },
    user: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    },
    orderItems: [
        {
            name: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true
            },
            image:{
                type: String,
                required:true
            },
            price: {
                type: Number,
                required: true
            },
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true
            }
        }
    ],
    paymentInfo: {
        id: {
            type: String,
        },
        status: {
            type: String
        }
    },
    payedAt: {
        type: Date
    },
    itemsPrice: {
        type: Number,
        required: true,
        default: 0.00
    },
    taxPrice: {
        type: Number,
        required: true,
        default: 0.00
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 0.00
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.00
    },
    orderStatus: {
        type: String,
        required: true,
        default: 'Processing'
    },
    deliveredAt: Date,
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

const Order = mongoose.model('Order', orderSchema)

//create an order 

app.route('/order/new')
    .post(async function(req, res){

        const token = req.cookies.token
        if(!token){
            res.send({
                success: false,
                message: 'User not logged in'
            })
         } else {
               const decode = jwt.verify(token, 'shhhh')
               const userDecode = await User.findById(decode.id)

                req.body.user = userDecode.id
                req.body.payedAt = Date.now()
                const newOrder = new Order(req.body)
    
                newOrder.save(function(err){
                    if(err){
                        res.send({
                            success: false,
                            message: err.message,
                            stack: err.stack
                        })
                    } else {
                       res.send({
                           success: true,
                           newOrder
                       }) 
                    }
                })
            }
        
    })

//get one order

app.route('/order/admin/:id')
    .get(async function(req, res){
        const token = req.cookies.token
        if(!token){
            res.send({
                success: false,
                message: 'User not logged in'
            })
        } else {
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const userRole = userDecode.role
            const adminUser = userRole.includes('admin')

            if(adminUser){
                const order = await Order.findById(req.params.id)

                if(!order){
                    res.send({
                        success: false,
                        message:"Order not found"
                    })
                } else {
                    res.send({
                        success: true,
                        order
                    })
                }
            } else {
                res.send({
                    success: false,
                    message:"You are not an admin"
                })
            }

        }

    })

//get order of user
app.route('/orders/me')
    .get(async function(req, res){
        const token = req.cookies.token 
        if(!token){
            res.send({
                successs: false,
                message: 'User not logged in'
            })
        } else {
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const orders = await Order.find({user: userDecode.id})

            if(orders.length == 0){
                res.send({
                    succes: false,
                    message: 'No orders'
                })
            } else {
                res.send({
                    succes: true,
                    count: orders.length,
                    orders
                })
            }
        }
    })

//get all orders
app.route('/orders/admin/all')
    .get(async function(req, res){
        const token = req.cookies.token 
        if(!token){
            res.send({
                successs: false,
                message: 'User not logged in'
            })
        } else {
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const userRole = userDecode.role
            const adminUser = userRole.includes('admin')

            if(adminUser){
                const orders = await Order.find()

                res.send({
                    succes: true,
                    count: orders.length,
                    orders
                })
            } else {
                res.send({
                    success : false,
                    message : 'You are not an admin'
                })
            }
        }
    })

//update order status and product stock
app.route('/orders/admin/update/:id')
    .put(async function(req, res){
        const token = req.cookies.token 
        if(!token){
            res.send({
                success: false,
                message: 'User not logged in'
            })
        } else {
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const userRole = userDecode.role
            const adminUser = userRole.includes('admin')

            if(adminUser){
                const order = await Order.findById(req.params.id)
                 
                order.orderItems.forEach(async function(docs){
                     const product = await Product.findById(docs.product)
                     product.stock = product.stock - docs.quantity

                      product.save({ validateBeforeSave: false })
                })

                order.orderStatus = req.body.status
                order.deliveredAt = Date.now()

                await order.save()

                res.send({
                    success: true,
                    message: "Status and quantity updated"
                })
            } else {
                res.send({
                    succes: false,
                    message: 'You are not an admin'
                })
            }
        }
    })

//delete order
app.route('/orders/admin/delete/:id')
    .delete(async function(req, res){
        const token = req.cookies.token 
        if(!token){
            res.send({
                success: false,
                message: 'User not logged in'
            })
        } else {
            const decode = jwt.verify(token, 'shhhh')
            const userDecode = await User.findById(decode.id)
            const userRole = userDecode.role
            const adminUser = userRole.includes('admin')

            if(adminUser){
                Order.findByIdAndDelete(req.params.id, function(err){
                    if(!err){
                        res.send({
                            success: true,
                            message: 'Order deleted'
                        })
                    } else {
                        res.send(err)
                    }
                }) 
            } else {
                res.send({
                    success: false,
                    message: 'You are not an admin'
                })
            }
        }
    })


app.listen(3000, function(){
    console.log('server is running')
})