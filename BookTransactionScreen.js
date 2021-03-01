import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Image, StyleSheet,ToastAndroid,KeyboardAvoidingView} from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import firebase from 'firebase';
import db from '../config';


export default class TransactionScreen extends React.Component {
  constructor(){
    super();
    this.state = {
      hasCameraPermissions : null,
      scanned : false,
      scannedBookId : '',
      scannedStudentId : '',
      buttonState : 'normal',
      transactionMessage : ''
    }
  }

  getCameraPermissions = async (id) =>{
    const {status}  = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" is true when user has granted permission
        status === "granted" is false when user has not granted the permission
      */
      hasCameraPermissions : status === "granted",
      buttonState : id,
      scanned : false
    })
  }

  handleBarCodeScanned  = async ({type, data})=>{
    const { buttonState} = this.state

    if(buttonState === "BookId"){
      this.setState({
        scanned : true,
        scannedBookId : data,
        buttonState : 'normal'
      });
    }
    else if(buttonState === "StudentId"){
      this.setState({
        scanned : true,
        scannedStudentId : data,
        buttonState : 'normal'
      })
    }
  }

  initiateBookIssue = async ()=>{
    //add a transaction
    db.collection("transaction").add({
      'studentId' : this.state.scannedStudentId,
      'bookId' : this.state.scannedBookId,
      'data' : firebase.firestore.Timestamp.now().toDate(),
      'transactionType' : "Issue"
    })

    //change book status
    db.collection("books").doc(this.state.scannedBookId).update({
      'bookAvailability' : false
    })
    //change number of issued books for student
    db.collection("students").doc(this.state.scannedStudentId).update({
      'NoOfBooksIssued' : firebase.firestore.FieldValue.increment(1)
    })

    this.setState({
      scannedStudentId : '',
      scannedBookId: ''
    })
  }

  initiateBookReturn = async ()=>{
    //add a transaction
    db.collection("transaction").add({
      'studentId' : this.state.scannedStudentId,
      'bookId' : this.state.scannedBookId,
      'date'   : firebase.firestore.Timestamp.now().toDate(),
      'transactionType' : "Return"
    })

    //change book status
    db.collection("books").doc(this.state.scannedBookId).update({
      'bookAvailability' : true
    })

    //change book status
    db.collection("students").doc(this.state.scannedStudentId).update({
      'NoOfBooksIssued' : firebase.firestore.FieldValue.increment(-1)
    })

    this.setState({
      scannedStudentId : '',
      scannedBookId : ''
    })
  }

  handleTransaction = async()=>{
    var transactionType = await this.checkBookEligibility();
    console.log(transactionType)
    if(!transactionType){
      alert('book does not exist in the database');
      this.setState({
        scannedStudentId:"",
        scannedBookId:""
    })}
      else if(transactionType=="issue"){
var isStudentEligible=await this.checkStudentEligibilityforBookIssue();
if(isStudentEligible){
  this.initiateBookIssue();
  alert("Book issued to student")
}
{var isStudentEligible=await this.checkStudentEligibilityforBookReturn()
if (isStudentEligible){
  this.initiateBookReturn();
  alert("Book returned to the library")
}}
     }   }
   
checkBookEligibility=async()=>{
  const bookRef =await db.collection("books").where("bookId","==",this.state.scannedBookId).get()
  console.log(bookRef)
  var transactionType=""
  if(bookRef.docs.length==0){
    transactionType=false
  }
  else{
    bookRef.docs.map(doc=>{
      var book=doc.data()
      if(book.bookAvailability){
        transactionType="issue"
      }
      else{
        transactionType="return"
      }
    })
  }
  return transactionType
}



checkStudentEligibilityforBookIssue=async()=>{
  const studentRef =await db.collection("students").where("studentId","==",this.state.scannedStudentId).get();
  var isStudentEligible="";
  if(studentRef.docs.length==0){
    this.setState({scannedBookId:"",scannedStudentId:""})
    isStudentEligible=false;
    alert("student does not exist in the database")
  }
  else{
    studentRef.docs.map(doc=>{
      var student=doc.data()
      if(student.NoOfBooksIssued<2){
        isStudentEligible=true
      }
      else{
        isStudentEligible=false;
        alert("the student has already issued two books");
        this.setState({scannedStudentId:"",scannedBookId:""})
      }
    })
  }
  return isStudentEligible;
}
checkStudentEligibilityforBookReturn=async()=>{
  const transactionRef =await db.collection("transactions").where("bookId","==",this.state.scannedBookId).limit(1).get();

  var isStudentEligible="";
  transactionRef.docs.map(doc=>{
    var lastBookTransaction=doc.data()
    if(lastBookTransaction.studentId==this.state.scannedStudentId){
      isStudentEligible=true
    }
    else{
      isStudentEligible=false;
      alert("Book wasnt issued by the student")
      this.setState({scannedBookId:"",scannedStudentId:""})
    }
  
    
    
      
    
    })
  
  return isStudentEligible;
}
  render(){
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;

    if(buttonState !== "normal" && hasCameraPermissions){
      return(
        <BarCodeScanner
          onBarCodeScanned = {scanned ? undefined : this.handleBarCodeScanned}
          style = {StyleSheet.absoluteFillObject}
        />
      );
      
    }

    else if (buttonState === "normal"){
      return(
        <KeyboardAvoidingView style={styles.container} behavior="padding" enabled>
        <View style={styles.container}>
        <View>
          <Image
            source = {require("../assets/booklogo.jpg")}
            style= {{width:200, height:200}}/>
          <Text style={{textAlign:'center', fontSize:30,}}>Wily</Text>
        </View>
        <View style={styles.inputView}>
        <TextInput
        onChangeText={text=>this.setState({scannedBookId:text})}
          style={styles.inputBox}
          placeholder="Book Id"
          value={this.state.scannedBookId}/>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={()=>{
            this.getCameraPermissions("BookId")
          }}>
          <Text style={styles.buttonText}>Scan</Text>
        </TouchableOpacity>
        </View>

        <View style={styles.inputView}>
        <TextInput
        onChangeText={text=>this.setState({scannedStudentId:text})}
          style={styles.inputBox}
          placeholder="Student Id"
          value={this.state.scannedStudentId}/>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={()=>{
            this.getCameraPermissions("StudentId")
          }}>
          <Text style={styles.buttonText}>Scan</Text>
        </TouchableOpacity>
        </View>
        <Text style={styles.transactionAlert}>{this.state.transactionMessage}</Text>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={async()=>{
            var transactionMessage = await this.handleTransaction();
          }}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
      )
    }
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  displayText:{
    fontSize: 15,
    textDecorationLine: 'underline'
  },
  scanButton:{
    backgroundColor: '#2196F3',
    padding: 10,
    margin: 10
  },
  buttonText:{
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10
  },
  inputView:{
    flexDirection: 'row',
    margin: 20
  },
  inputBox:{
    width: 200,
    height: 40,
    borderWidth: 1.5,
    borderRightWidth: 0,
    fontSize: 20
  },
  scanButton:{
    backgroundColor: '#66BB6A',
    width: 50,
    borderWidth: 1.5,
    borderLeftWidth: 0
  },
  submitButton:{
    backgroundColor: '#FBC02D',
    width: 100,
    height:50
  },
  submitButtonText:{
    padding: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight:"bold",
    color: 'white'
  }
});
