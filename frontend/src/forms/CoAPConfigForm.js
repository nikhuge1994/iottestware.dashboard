/********************************************************************************
 * Copyright (c) 2019 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0
 *
 * SPDX-License-Identifier: EPL-2.0 4
 ********************************************************************************/
import React from 'react'
import {Button} from 'primereact/button'
import {Growl} from 'primereact/growl'
import HostInput from './inputs/HostInput'
import PortInput from './inputs/PortInput'
import ResourceInput from './inputs/ResourceInput'
import ResourceField from './inputs/ResourceField'
import update from 'immutability-helper'
import TestCaseSelect from './inputs/TestCaseSelect'
import { testsuiteConfigURI, testsuiteRunURI } from '../utils/BackendEndpoints'
import { withRouter } from 'react-router-dom'

class CoAPConfigForm extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      resources: new Map(),
      host: 'coap.me',
      port: '5683',
      testcases: []
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.addResource = this.addResource.bind(this)
    this.removeResource = this.removeResource.bind(this)
    this.handleSelectionChange = this.handleSelectionChange.bind(this)
  }

  handleSelectionChange (selection) {
    this.setState(update(this.state, {testcases: {$set: selection}}))
  }

  handleChange (event) {
    const target = event.target
    const value = target.type === 'checkbox' ? target.checked : target.value
    const name = target.id

    const newInputState = update(this.state, {
      [name]: {$set: value}
    })

    this.setState(newInputState)
  }

  addResource (newResource) {
    const newResourceMap = new Map(this.state.resources)
    newResourceMap.set(newResource.id, newResource)

    this.setState(update(this.state, {
      resources: {$set: newResourceMap}
    }))
  }

  removeResource (resourceId) {
    if (this.state.resources.has(resourceId)) {
      this.growl.show({severity: 'success', summary: 'Remove Resource', detail: 'Removed CoAP Resource: ' + resourceId})

      // given resourceId is within the Map -> copy Map for update
      const newResourceMap = new Map(this.state.resources)

      // remove the requested resource and update the state
      if (newResourceMap.delete(resourceId)) {
        this.setState({resources: newResourceMap})
      }
    }
  }

  handleSubmit (event) {
    // prevent the default behaviour of <form> which would reload the whole page
    event.preventDefault()

    let jsonRequest = {
      'host': this.state.host,
      'port': this.state.port,
      'testcases': this.state.testcases,
      'resources': []
    }

    this.state.resources.forEach((value) => jsonRequest.resources.push(value))

    jsonRequest = JSON.stringify(jsonRequest)

    fetch(testsuiteConfigURI('coap'), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: jsonRequest
    }).then(async response => {
      if (response.status !== 200) {
        const errorMessage = await response.json()
        throw errorMessage
      }

      return response.json()
    }).then(payload => {
      // payload.config contains the name of the configuration file!
      const timestamp = payload.timestamp
      fetch(testsuiteRunURI('coap', timestamp), {method: 'GET'})
        .then(async runResponse => {
          if (runResponse.status !== 200) {
            const errorMessage = await runResponse.json()
            throw errorMessage
          }
          return runResponse.json()
        })
        .then(payload => {
          // show /testresults/coap // TODO: get ID from payload and show /testresults/coap/ID
          this.props.history.push('/testresults/coap')
        })
        .catch(error => {
        // this error is thrown if Titan/TestSuite is not installed properly
          this.growl.show({severity: 'error', summary: 'Missing Titan/TestSuite', detail: error.reason})
        })
    }).catch(error => {
      this.growl.show({severity: 'error', summary: 'Incorrect Input', detail: error.message})
    })
  }

  render () {
    const resources = []
    this.state.resources.forEach(r => { resources.push(r) })

    return (
      <div className='form'>
        <form onSubmit={event => { this.handleSubmit(event) }}>
          <h3 className='first'>Host</h3>
          <div className='ui-g ui-fluid'>
            <Growl ref={(el) => this.growl = el} />
            <HostInput handleChange={this.handleChange} value={this.state.host} defaultValue='coap.me' />
            <PortInput handleChange={this.handleChange} value={this.state.port} defaultValue={5683} />
          </div>

          <ResourceInput addResource={this.addResource} />
          <ResourceField resources={resources} remove={this.removeResource} />

          <h3 className='first'>Test cases</h3>
          <div className='ui-g ui-fluid'>
            <div className='ui-g-12 ui-md-12'>
              <TestCaseSelect handleSelectionChange={this.handleSelectionChange} protocol={'coap'} />
            </div>
          </div>

          <div className='ui-g ui-fluid'>
            <div className='ui-g-12 ui-md-2'>
              <Button icon='fa fa-play' label='Run' type='submit' />
            </div>
          </div>
        </form>
      </div>
    )
  }
}

export default withRouter(CoAPConfigForm)
