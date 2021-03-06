const config = require('./config')
const express = require('express')
const app = express()
app.set('secret', config.secret)
app.use(express.static('build'))
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
const cors = require('cors')
app.use(cors())
require('dotenv').config()

//ssl & https 
var http = require('http');
const server = http.createServer( /*credentials,*/ app);

// MongoDB
//Import the mongoose module
const mongoose = require('mongoose');
//Set up default mongoose connection
mongoose.connect('mongodb://' +  process.env.DB_HOST + '/todo', { useUnifiedTopology: true, useNewUrlParser: true });
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
const db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Animal = require('./models/Animal');

//GraphQL start
mongoose.set('useFindAndModify', false);
const ExpressGraphQL = require("express-graphql");
const {
    GraphQLID,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema
} = require("graphql");

const AnimalType = new GraphQLObjectType({
    name: "Animal",
    fields: {
        _id: { type: GraphQLID },
        name: { type: GraphQLString },
        category: { type: GraphQLString }
    }
});

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "Query",
        fields: {
            animals: {
                type: GraphQLList(AnimalType),
                resolve: (root: any, args: any, context: any, info: any) => {
                    return Animal.find().exec();
                }
            },
            animal: {
                type: AnimalType,
                args: {
                    name: { type: GraphQLNonNull(GraphQLString) }
                },
                resolve: (root: any, args: any, context: any, info: any) => {
                    return Animal.findOne({ name: args.name}).exec();
                }
            }
        }
    }),
    mutation: new GraphQLObjectType({
        name: "Mutation",
        fields: {
            createAnimal: {
                type: AnimalType,
                args: {
                    name: { type: GraphQLNonNull(GraphQLString) }
                },
                resolve: (root: any, args: any, context: any, info: any) => {
                    var animal = new Animal(args);
                    return animal.save();
                }
            },
            updateAnimal: {
                type: AnimalType,
                args: {
                    name: { type: GraphQLNonNull(GraphQLString) },
                    newCategory: { type: GraphQLNonNull(GraphQLString) }
                },
                resolve: async (root: any, args: any, context: any, info: any) => {
                    const uAuthor = await Animal.findOneAndUpdate(
                        {name: args.name}, { category: args.newCategory }, {new: true}, (err: any, res: any) => {
                            if (err) {
                                console.log("Something wrong when updating data!");
                            }
                            console.log(res) ;
                            return res;
                        }
                    );
                    return uAuthor;
                }
            }
        }
    })
});

app.use("/api/graphql", ExpressGraphQL({
    schema: schema,
    graphiql: true
}));
//GraphQL end

app.post( "/api/create", cors(), ( req: any, res: any) => {
    console.log('/create')
    const { category, mass, size, name } = req.body
      const elephant = new Animal({
        category: category,
        mass: mass,
        size: size,
        name: name
      });

      // store document
      elephant.save((err: any, elephant: any) => {
        if (err) {
          return console.error(err);
        }
        console.log('document saved');
        //db.close(); // this close the connection with db. if close you need to reconnect it
      });
      res.send( "Save OK!" );

});

app.post( "/api/read", cors(), ( req: any, res: any) => {
    Animal.findOne({
        category: req.body.category
    }, function(err: any, docs: any) {
        console.log('docs' , docs)
        if ( docs && ( docs.category === req.body.category )) {
            res.send(docs);
            console.log(docs.category);
        } else {
            //console.log(docs.category);
            res.send('cant find');
        }
    });
} );

app.post( "/api/update", cors(), ( req: any, res: any) => {
    const { category, mass, size, name } = req.body
    Animal.update({
        category: category
    }, { category: category, mass: mass,size: size, name: name},  function(err: any) {
        if(!err) {
            res.send('updated');
        }
    });
} );

app.post( "/api/delete", cors(), ( req: any, res: any) => {
    const { category, mass, size, name } = req.body
    Animal.remove({
        category: category
    },  function(err: any) {
        if(!err)
            res.send('removed');
    });
} );

server.listen( config.APP_PORT,"0.0.0.0",function(){
    //console.log('process.env', process.env);
    console.log('server run at ' + config.APP_HOST  +  ':' + config.APP_PORT );
});