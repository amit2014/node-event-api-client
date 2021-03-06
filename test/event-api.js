'use strict'
global.should = require('chai').should()

const nock = require('nock'),
      through2 = require('through2')

describe('eventAPI', function() {

  const eventAPI = require('../index')

  function sendToEventAPI(event) {

    const stream = through2.obj()
    stream.write(event)
    stream.end()

    return eventAPI(stream, 'event-write-key')
  }

  it('should send objects to event api as gzipped ldjson', function*() {

    const scope = nock('https://event-sink.appuri.net', {
        reqheaders: {
          'Authorization': 'Bearer event-write-key',
          'Content-Type': 'application/x-ldjson',
          'Content-Encoding': 'gzip'
        }
      })
      .post(
        '/e',
        '1f8b0800000000000003ab564a2dcb4bcc4d55b2522ace4ccf4b4d89cfcc53d2514acd2ba92c00099616a71601f9202a3e33052890946a666a64616ea454cb05003c55fcf93c000000')
      .reply(202)

    const resp = yield sendToEventAPI({ evname: 'signed_in', entype: 'user', user_id: 'be652872' })
    resp.statusCode.should.equal(202)

    scope.isDone().should.be.true
  })

  it('should throw if the response is not 202', function*() {

    const scope = nock('https://event-sink.appuri.net', {
        reqheaders: {
          'Authorization': 'Bearer event-write-key',
          'Content-Type': 'application/x-ldjson',
          'Content-Encoding': 'gzip'
        }
      })
      .post(
        '/e',
        '1f8b0800000000000003ab564a2dcb4bcc4d55b2522ace4ccf4b4d89cfcc53d2514acd2ba92c00099616a71601f9202a3e33052890946a666a64616ea454cb05003c55fcf93c000000')
      .reply(400, {
        message: 'Event #1 (offset 0) had the following errors: [isAllValidKeys: one or more JSON keys is a reserved key.]'
      })

    try {
      yield sendToEventAPI({ evname: 'signed_in', entype: 'user', user_id: 'be652872' })
      false.should.be.true
    } catch(e) {
      e.statusCode.should.equal(400)
      e.responseBody.should.deep.equal({
        message: 'Event #1 (offset 0) had the following errors: [isAllValidKeys: one or more JSON keys is a reserved key.]'
      })
    }

    scope.isDone().should.be.true
  })
})
