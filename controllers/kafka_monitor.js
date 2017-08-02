'use strict';

module.exports = function () {
    let _ = require('lodash');
    let kafka = require('kafka-node');
    let protobuf = require('protobufjs');
    let data_model = require('../model/bluesense.js');

    // Create client.
    let kafka_client = new kafka.Client('nim:2181');

    // List feeds.
    kafka_client.once('connect', () => {
        kafka_client.loadMetadataForTopics([], (err, res) => {
            if (err) {
                return console.error(err);
            }

            let metadata = _.get(res, ['1', 'metadata']);

            for (let key in metadata) {
                if (metadata.hasOwnProperty(key)) {
                    console.log(key + " -> %j", metadata[key]);
                }
            }
        });
    });

    // Create Kafka consumer.
    let high_level_consumer = new kafka.HighLevelConsumer(
        kafka_client,
        [{ topic: 'prd.la.measurements' }],
        {
            // Consumer group id, default `kafka-node-group`
            groupId: 'kafka-node-group',
            // Optional consumer id, defaults to groupId + uuid
            id: 'monitor-daemon',
            // Auto commit config
            autoCommit: true,
            autoCommitIntervalMs: 5000,
            // The max wait time is the maximum amount of time in milliseconds to block waiting if insufficient data is available at the time the request is issued, default 100ms
            fetchMaxWaitMs: 100,
            // This is the minimum number of bytes of messages that must be available to give a response, default 1 byte
            fetchMinBytes: 1,
            // The maximum bytes to include in the message set for this partition. This helps bound the size of the response.
            fetchMaxBytes: 1024 * 1024,
            // If set true, consumer will fetch message from the given offset in the payloads
            fromOffset: false,
            // If set to 'buffer', values will be returned as raw buffer objects.
            encoding: 'buffer'
        }
    );

    let MeasurementEvent = data_model.io.bluesense.daq.model.MeasurementEvent

    high_level_consumer.on('message', (message) => {
        try {
            let event = MeasurementEvent.decode(message.value);
            console.log('%j', event);
        } catch (err) {
            if (err instanceof protobuf.util.ProtocolError) {
                // Do nothing for now.
            } else {
                console.error(err);
                console.error(message.value);
            }
        }
    });

    high_level_consumer.on('error', (err) => {
        console.error(err);
    });

    process.on('SIGINT', () => {
        high_level_consumer.close(true, () => {
            process.exit();
        });
    });

    // Trigger for nodemon.
    // nodemon uses SIGUSR2.
    // Does not really work as expected.
    process.on('SIGUSR2', () => {
        high_level_consumer.close(true, () => {
            process.kill(process.pid, 'SIGUSR2');
        });
    });

}