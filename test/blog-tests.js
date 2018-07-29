'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// function to create fake data for db
function seedBlogData() {
    console.info('seeding blog post data');
    const seedData = [];

    for (let i = 1; i <= 10; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}

//function to generate blog post data
function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        created: faker.date.recent()
    };
}

// function to delete database to start over each test
function tearDownDb() {
    console.warn('deleting database');
    return mongoose.connection.dropDatabase();
}

 
describe('Blogposts API resource', function() {

    // function to start server
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    // function to test GET endpoint
    describe('GET endpoint', function() {

        it('should return all blog posts', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(_res => {
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.blogposts).to.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(count => {
                expect(res.body.blogposts).to.have.lengthOf(count);
            });
        });
    
        it('should return posts with right fields', function() {
            let resBlogPost;
            return chai.request(app)
            .get('/posts')
            .then(res => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.blogposts).to.be.a('array');
                expect(res.body.blogposts).to.have.lengthOf.at.least(1);

                res.body.posts.forEach(blogpost => {
                    expect(blogpost).to.be.a('object');
                    expect(blogpost).to.include.keys(
                        'id', 'author', 'title', 'content', 'created'
                    );
                });
                resBlogPost = res.body.blogposts[0];
                return BlogPost.findById(resBlogPost.id);
            })
            .then(blogpost => {
                expect(resBlogPost.id).to.equal(blogpost.id);
                expect(resBlogPost.author).to.equal(blogpost.author);
                expect(resBlogPost.title).to.equal(blogpost.title);
                expect(resBlogPost.content).to.equal(blogpost.content);
                expect(resBlogPost.created).to.equal(blogpost.created);
            });
        });
    });

    // function for POST endpoint
    describe('POST endpoint', function() {

        it('should add a new blog post', function() {
            let newBlogPost = {
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName(),
                },
                title: faker.lorem.sentence(),
                content: faker.lorem.paragraph()
            }

            return chai.request(app)
            .post('/posts')
            .send(newBlogPost)
            .then(res => {
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('id', 'author', 'title', 'content', 'created');
                expect(res.body.author).to.equal(`${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`);
                expect(res.body.id).to.not.be.null;
                expect(res.body.title).to.equal(newBlogPost.title);
                expect(res.body.content).to.equal(newBlogPost.content);
                return BlogPost.findById(res.body.id);
            })
            .then(post => {
                expect(post.author.firstName).to.equal(newBlogPost.author.firstName);
                expect(post.author.lastName).to.equal(newBlogPost.author.lastName);
                expect(post.title).to.equal(newBlogPost.title);
                expect(post.content).to.equal(newBlogPost.content);
            });
        });
    });

    //function for PUT endpoint
    describe('PUT endpoint', function() {
        
        it('should update a blog post', function() {
            const updateBlogData = {
                author: {
                    firstName: 'Maria',
                    lastName: 'Pal'
                },
                title: 'Testing endpoints',
                content: 'I hope this works!! :)'
            };
            
            return BlogPost
            .findOne()
            .then(post => {
                updateBlogData.id = post.id;

                return chai.request(app)
                .put(`/posts/${post.id}`)
                .send(updateBlogData)
            })
                .then(res => {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateBlogData.id);
                })
                .then(post => {
                    expect(post.author.firstName).to.equal(updateBlogData.author.firstName);
                    expect(post.author.lastName).to.equal(updateBlogData.author.lastName);
                    expect(post.title).to.equal(updateBlogData.title);
                    expect(post.content).to.equal(updateBlogData.content);
                });
        });
    });

    // function for DELETE enpoint
    describe('DELETE endpoint', function() {

        it('should delete a blog post', function() {
            let blogpost;
            
            return BlogPost
            findOne()
            .then(_blogpost => {
                blogpost = _blogpost;
                return chai.request(app)
                .delete(`/posts/${blogpost.id}`)
            })
            .then(res => {
                expect(res).to.have.status(204);
                return BlogPost.findById(blogpost.id);
            })
            .then(_blogpost => {
                expect(_blogpost).to.be.null;
            });
        });
    });

});

