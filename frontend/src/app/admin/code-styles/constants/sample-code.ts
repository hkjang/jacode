export const SAMPLE_CODE: Record<string, string> = {
  typescript: `
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'My App';
  
  constructor() {
    this.initialize();
  }

  initialize(): void {
    const data = [1, 2, 3];
    const filtered = data.filter(n => n > 1);
    console.log('Initialized', filtered);
  }
}
`,
  javascript: `
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const message = "Hello World!";
  res.send(message);
});

function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + item.price;
  }, 0);
}

app.listen(port, () => {
  console.log(\`Example app listening at http://localhost:\${port}\`);
});
`,
  python: `
import os
import sys

def main():
    name = "World"
    print(f"Hello, {name}!")

    items = ["apple", "banana", "cherry"]
    for item in items:
        if len(item) > 5:
            print(item)

class DataProcessor:
    def __init__(self, data):
        self.data = data

    def process(self):
        return [x * 2 for x in self.data]

if __name__ == "__main__":
    main()
`,
  java: `
import java.util.List;
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        String message = "Hello World";
        System.out.println(message);

        List<String> items = new ArrayList<>();
        items.add("Item 1");
        
        for (String item : items) {
            processItem(item);
        }
    }

    private static void processItem(String item) {
        if (item != null) {
            System.out.println("Processing: " + item);
        }
    }
}
`,
  go: `
package main

import (
	"fmt"
	"strings"
)

type User struct {
	Name  string
	Email string
}

func main() {
	user := User{
		Name:  "John Doe",
		Email: "john@example.com",
	}

	fmt.Printf("Hello, %s\n", user.Name)
	
	items := []string{"a", "b", "c"}
	for _, item := range items {
		fmt.Println(strings.ToUpper(item))
	}
}
`,
  rust: `
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 10, y: 20 };
    println!("Point: ({}, {})", p.x, p.y);

    let numbers = vec![1, 2, 3, 4, 5];
    let even_numbers: Vec<i32> = numbers
        .into_iter()
        .filter(|&x| x % 2 == 0)
        .collect();
        
    for num in even_numbers {
        println!("Even: {}", num);
    }
}
`,
  cpp: `
#include <iostream>
#include <vector>
#include <string>

using namespace std;

class greeter {
public:
    void say_hello(string name) {
        cout << "Hello, " << name << "!" << endl;
    }
};

int main() {
    greeter g;
    g.say_hello("World");

    vector<int> numbers = {1, 2, 3, 4, 5};
    for(int n : numbers) {
        if (n % 2 == 0) {
            cout << n << " is even" << endl;
        }
    }
    
    return 0;
}
`
};
