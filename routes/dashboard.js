// -*- coding: utf-8 -*-
'use strict';

/**
 * Dashboard routes.
 */
var express = require('express');
var router = express.Router();
var controller = require('../controllers/dashboard.js');


router.get('/', controller.run_simulation);

router.post('/', controller.configure_simulation);

module.exports = router;
