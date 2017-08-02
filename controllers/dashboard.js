// -*- coding: utf-8 -*-
'use strict';

var MODULE = 'controller.dashboard'

/**
 * Dashboard controller.
 */
var debug = require('debug')(MODULE);
var random = require('seedrandom').xor4096;
var d3 = require('d3');



function random_int(seed, min, max) {
    var self  = this;

    self.random = new random(seed);
    self.min =  Math.ceil(min);
    self.max = Math.floor(max);

    self.next = function() {
        return Math.floor(self.random() * (self.max - self.min)) + self.min;
    }
}

class Simulation {
    constructor(n_cards, n_trials) {
        this.n_cards = n_cards;
        this.n_trials = n_trials;
    }

    run() {
        debug('Running simulation with n_cards = ', this.n_cards, ' and ', ' n_trials = ', this.n_trials);

        var random = new random_int('deep space', 0, this.n_cards);

        return d3.range(this.n_trials).map(() => {
            var set = d3.set();
            var number_of_draws = 0;

            while (set.size() < this.n_cards) {
                set.add(random.next());
                number_of_draws++;
            }

            return number_of_draws;
        });
    }
};

class Figure {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this._summary;
        this._data;
        this._x_scale;
    }

    get data() {
        return this._data;
    }

    set data(new_data) {
        this._data = new_data;
    }

    get x_scale() {
        return this._x_scale;
    }

    set x_scale(scale) {
        this._x_scale = scale;
    }

    get summary() {
        return this._summary;
    }

    set summary(summary) {
        this._summary = summary;
    }
};

// Exists inside modules scope.
var SIMULATION = new Simulation(10, 1000);


function start(req, res, next) {
    debug('Running Simulation!');

    next();
}

function finish(req, res, next) {
    debug('Finished Simulation!');
}

function run_simulation(req, res, next) {
    debug('Begin SIMULATION = ', SIMULATION);

    var figure = new Figure('ds9', 'Gotta catch \'em all!');
    figure.data = [ { x: 0, y: 40 }, { x: 1, y: 49 }, { x: 2, y: 17 }, { x: 3, y: 42 } ];

    var results = SIMULATION.run();

    var min = d3.min(results);
    var max = d3.max(results);
    var mean = d3.mean(results);
    var median = d3.median(results);

    debug('min = ', min, ', max = ', max, ', average = ', mean, ' median = ', median);

    var histogram = d3.histogram().domain([d3.min(results), d3.max(results)]).thresholds(100)(results)

    figure.data = histogram.map(function(e) { return {x: 0.5 * (e.x1 + e.x0), y: e.length} });

    figure.summary = 'One needs to collect ' + Math.ceil(mean) + ' cards on avarage to get the complete set. ' +
                     'Some people are very lucky and only need to collect ' + min + ' cards. Some are very ' +
                     'unlucky and need to collect ' + max + ' cards.'
    res.locals.figure = figure;

    debug('End SIMULATION: simulate = ', SIMULATION);

    next();
}

function render_results(req, res, next) {
    res.render('dashboard', {graph: res.locals.figure, simulation: SIMULATION});

    next();
}

/**
 * Run and display simulation.
 *
 * See https://expressjs.com/en/guide/routing.html.
 *
 * Note that we can call render only once, because the headers have been set and sent after the firtst call.
 *
 */

module.exports.run_simulation = [start, run_simulation, render_results, finish]

/**
 * Configure simulation.
 */
module.exports.configure_simulation = function(req, res, next) {
    debug('Begin POST: simulate = ', SIMULATION);

    // Check form data is valid.
    req.checkBody('cards').optional().isInt({min: 1});
    req.checkBody('trials').optional().isInt({min: 1});

    var errors = req.validationErrors();

    if (errors) {
        // debug('Was expecting an int.');
        // var graph = new Graph('ds9', 'deep space exploration')
        // graph.data = [ { x: 0, y: 40 }, { x: 1, y: 49 }, { x: 2, y: 17 }, { x: 3, y: 42 } ];
        // res.render('dashboard', {graph: graph, simulation: SIMULATION, errors: errors})
        // Need more fancy error handling/display.
        res.send(errors);
        return;
    }

    debug('Set contains ' + req.body.cards + ' cards.');
    debug('We want to run ' + req.body.trials + ' trials.');

    SIMULATION.n_cards = Number(req.body.cards);
    SIMULATION.n_trials = Number(req.body.trials);

    res.redirect('/');

    debug('End POST: simulate = ', SIMULATION);
};