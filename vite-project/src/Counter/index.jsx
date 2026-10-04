import {useState} from 'react'
import './index.css'
const Counter =() => {
    const [count,setCount]=useState(0) 
    const OnIncreament=()=>{
        setCount(prevCount=>prevCount+1)
    }
    const OnDecreament=()=>{
        setCount(prevCount=>prevCount-1)
    }
    return(
        
        <div className="container"> 
            <h1>Counter {count}</h1> 
            <div>
                <button  className="button" onClick={OnIncreament}>Increase</button> 
                <button  className="button" onClick={OnDecreament}>Decrease</button> 
            </div>
        </div>
    )
}
export default Counter